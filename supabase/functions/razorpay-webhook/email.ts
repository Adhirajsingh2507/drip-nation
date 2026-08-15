// ============================================================
// DRIP NATION — order-confirmation email template (Phase 5.5)
//
// Email-client-safe: table layout, inline styles, hex colors, system fonts
// (no flexbox/grid, no external CSS/fonts). Money is integer whole rupees.
// Returns { subject, html, text } for Resend.
// ============================================================

type OrderItem = { name: string; size: string | null; price: number; quantity: number };
type Order = {
  id: string;
  customer_name: string;
  email?: string | null;
  created_at?: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promo_code?: string | null;
  address?: { line1?: string; city?: string; state?: string; pincode?: string } | null;
  order_items?: OrderItem[];
};

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]!));

export function orderConfirmationEmail(order: Order, orderUrl?: string): { subject: string; html: string; text: string } {
  const short = String(order.id).slice(0, 8).toUpperCase();
  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const items = order.order_items ?? [];

  const itemRows = items.map((it) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;font-family:Helvetica,Arial,sans-serif;">
        <span style="font-size:14px;color:#ffffff;">${esc(it.name)}</span><br>
        <span style="font-size:11px;color:#777777;letter-spacing:1px;text-transform:uppercase;">${
          it.size ? 'Size ' + esc(it.size) + ' &middot; ' : ''
        }Qty ${it.quantity}</span>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #1a1a1a;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#ffffff;white-space:nowrap;">${inr(
        it.price * it.quantity,
      )}</td>
    </tr>`).join('');

  const totalRow = (label: string, value: string, opts: { strong?: boolean; accent?: string } = {}) => `
    <tr>
      <td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:${opts.strong ? '15px' : '13px'};color:${
        opts.accent || (opts.strong ? '#ffffff' : '#999999')
      };${opts.strong ? 'font-weight:700;letter-spacing:1px;text-transform:uppercase;' : ''}">${label}</td>
      <td align="right" style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:${
        opts.strong ? '18px' : '13px'
      };color:${opts.accent || '#ffffff'};${opts.strong ? 'font-weight:800;' : ''}white-space:nowrap;">${value}</td>
    </tr>`;

  const addr = order.address;
  const addressBlock = addr && (addr.line1 || addr.city)
    ? `
    <tr><td style="padding:28px 32px 0;">
      <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#666666;text-transform:uppercase;">Ship to</p>
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#cccccc;line-height:1.6;">
        ${esc(order.customer_name)}<br>
        ${esc(addr.line1 || '')}<br>
        ${esc([addr.city, addr.state, addr.pincode].filter(Boolean).join(', '))}
      </p>
    </td></tr>`
    : '';

  const buttonBlock = orderUrl
    ? `
    <tr><td style="padding:28px 32px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#ffffff;border-radius:2px;">
        <a href="${esc(orderUrl)}" style="display:inline-block;padding:14px 30px;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;color:#000000;text-decoration:none;text-transform:uppercase;">View your order</a>
      </td></tr></table>
    </td></tr>`
    : '';

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0a0a0a;border:1px solid #222222;">

        <tr><td style="padding:28px 32px;border-bottom:1px solid #222222;">
          <span style="font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:3px;color:#ffffff;">DRIP NATION</span>
        </td></tr>

        <tr><td style="padding:36px 32px 0;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#34d399;text-transform:uppercase;">Payment received</p>
          <h1 style="margin:8px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:28px;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">Order Confirmed</h1>
          <p style="margin:10px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#888888;">Order ${short}${date ? ' &middot; ' + date : ''}</p>
        </td></tr>

        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#cccccc;line-height:1.6;">Hey ${esc(
            order.customer_name,
          )}, thanks for the order — we're getting it ready. Here's your receipt.</p>
        </td></tr>

        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
        </td></tr>

        <tr><td style="padding:14px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${totalRow('Subtotal', inr(order.subtotal))}
            ${order.discount > 0 ? totalRow('Discount' + (order.promo_code ? ' (' + esc(order.promo_code) + ')' : ''), '-' + inr(order.discount), { accent: '#34d399' }) : ''}
            ${totalRow('Shipping', order.shipping === 0 ? 'FREE' : inr(order.shipping))}
            ${totalRow('Tax (18%)', inr(order.total - (order.subtotal - order.discount) - order.shipping))}
            <tr><td colspan="2" style="padding:8px 0 0;"><div style="border-top:1px solid #222222;"></div></td></tr>
            ${totalRow('Total', inr(order.total), { strong: true })}
          </table>
        </td></tr>

        ${buttonBlock}

        ${addressBlock}

        <tr><td style="padding:32px;">
          <div style="border-top:1px solid #222222;padding-top:24px;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#666666;line-height:1.7;">
              Questions? Reply to this email.<br>
              <span style="color:#444444;letter-spacing:1px;">DRIP NATION &middot; WHERE ATHLETIC HERITAGE MEETS THE CULTURE OF TOMORROW.</span>
            </p>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textLines = [
    `DRIP NATION — Order ${short} confirmed`,
    date ? `Date: ${date}` : '',
    '',
    ...items.map((it) => `- ${it.name}${it.size ? ` (Size ${it.size})` : ''} x${it.quantity}  ${inr(it.price * it.quantity)}`),
    '',
    `Subtotal: ${inr(order.subtotal)}`,
    order.discount > 0 ? `Discount: -${inr(order.discount)}` : '',
    `Shipping: ${order.shipping === 0 ? 'FREE' : inr(order.shipping)}`,
    `Total: ${inr(order.total)}`,
    orderUrl ? `\nView your order: ${orderUrl}` : '',
  ].filter(Boolean);

  return {
    subject: `DRIP NATION — Order ${short} confirmed`,
    html,
    text: textLines.join('\n'),
  };
}
