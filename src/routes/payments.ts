import { Router, Request, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const alumnosUrl = process.env.ALUMNOS_URL || 'http://localhost:5173';

let stripe: Stripe | null = null;
if (stripeKey) {
  stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.autopreview' as any });
}

export const paymentsRouter = Router();

paymentsRouter.get('/health', (_req, res: Response) => {
  res.json({
    status: stripe ? 'ok' : 'not_configured',
    mode: stripe && stripeKey.startsWith('sk_live') ? 'live' : 'test',
    timestamp: new Date().toISOString(),
  });
});

paymentsRouter.get('/plans', async (_req, res: Response) => {
  if (isSupabaseReady()) {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
    return;
  }
  res.json([
    {
      id: 'plan-monthly',
      name: 'Mensual',
      description: 'Acceso completo al simulador laboral',
      price: 299.00,
      currency: 'MXN',
      interval: 'month',
    },
    {
      id: 'plan-quarterly',
      name: 'Trimestral',
      description: '3 meses de acceso con 2 meses de descuento',
      price: 599.00,
      currency: 'MXN',
      interval: 'quarter',
    },
  ]);
});

paymentsRouter.post('/create-checkout', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe no configurado. Revisa STRIPE_SECRET_KEY.' });
    return;
  }

  const userId = req.user?.id;
  const userEmail = req.user?.email;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

  const { priceId, planId } = req.body;
  if (!planId) { res.status(400).json({ error: 'planId requerido' }); return; }

  try {
    let customerId: string | undefined;

    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    }

    const lineItems: any[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [{ price_data: {
          currency: 'mxn',
          product_data: { name: 'Simulador Laboral Contable' },
          recurring: planId === 'plan-quarterly'
            ? { interval: 'month', interval_count: 3 }
            : { interval: 'month' },
          unit_amount: planId === 'plan-quarterly' ? 59900 : 29900,
        }, quantity: 1 }];

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer: customerId,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: { userId, plan_id: planId },
      success_url: `${alumnosUrl}/student/simulador?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${alumnosUrl}/student/simulador`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('[Stripe] Error creating checkout:', err);
    res.status(500).json({ error: err.message });
  }
});

paymentsRouter.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe || !stripeWebhookSecret) {
    res.status(503).json({ error: 'Stripe webhook no configurado' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  if (!sig) { res.status(400).json({ error: 'Firma faltante' }); return; }

  const rawBody = (req as any).rawBody;
  if (!rawBody) { res.status(400).json({ error: 'rawBody no disponible' }); return; }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
  } catch (err: any) {
    console.error('[Stripe] Webhook signature error:', err);
    res.status(400).json({ error: err.message });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.plan_id || 'plan-monthly';

        if (userId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string) as any;
          const periodStart = typeof sub.current_period_start === 'number'
            ? sub.current_period_start : sub.current_period_start.seconds;
          const periodEnd = typeof sub.current_period_end === 'number'
            ? sub.current_period_end : sub.current_period_end.seconds;
          await supabaseAdmin.from('user_subscriptions').insert({
            user_id: userId,
            plan_id: planId === 'plan-quarterly' ? 'plan-quarterly' : 'plan-monthly',
            stripe_subscription_id: sub.id,
            stripe_customer_id: session.customer as string,
            status: 'active',
            current_period_start: new Date(periodStart * 1000).toISOString(),
            current_period_end: new Date(periodEnd * 1000).toISOString(),
          });
          console.log(`[Stripe] Subscription created for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: subscription.status === 'active' ? 'active' : 'cancelled',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe] Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});
