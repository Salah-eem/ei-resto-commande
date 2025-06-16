import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Sends the order receipt email to the customer at the moment the order is picked up or delivered.
   * @param toEmail The customer’s email address.
   * @param order The full Order object (including items, total, etc.).
   */
  async sendOrderReceipt(toEmail: string, order: any) {
    try {
      // Determine the verb based on order type (pickup vs. delivery)
      const actionText =
        order.orderType === 'delivery'
          ? 'delivered to your address'
          : 'picked up';

      const htmlBody = `
      <h2>Your order has been ${actionText}!</h2>
      <p>Hello ${order.customer?.name || 'customer'},</p>
      <p>Your order (ID: <strong>${order._id.toString().slice(-4)}</strong>) is now <strong>${actionText}</strong>. Here are the details one more time:</p>
      <ul>
        ${
          Array.isArray(order.items)
            ? order.items
                .map((it: any) => {
                  // Unit price and quantity
                  const unitPrice = Number(it.price) || 0;
                  const qty = Number(it.quantity) || 0;
                  const lineTotal = unitPrice * qty;

                  // Build maps for base vs extras
                  const baseMap: Record<string, number> = {};
                  if (Array.isArray(it.baseIngredientsSnapshot)) {
                    it.baseIngredientsSnapshot.forEach((b: any) => {
                      const id = String(b._id);
                      baseMap[id] =
                        (baseMap[id] || 0) + (Number(b.quantity) || 0);
                    });
                  }

                  const extraMap: Record<string, number> = {};
                  if (Array.isArray(it.extraIngredientsSnapshot)) {
                    it.extraIngredientsSnapshot.forEach((e: any) => {
                      const id = String(e._id);
                      extraMap[id] =
                        (extraMap[id] || 0) + (Number(e.quantity) || 0);
                    });
                  }

                  // 1) For each base ingredient, check if removed or modified
                  let modificationsHtml = '';
                  if (Array.isArray(it.baseIngredientsSnapshot)) {
                    const baseLines = it.baseIngredientsSnapshot
                      .map((b: any) => {
                        const id = String(b._id);
                        const name = b.name || 'Ingredient';
                        const baseQty = Number(b.quantity) || 0;
                        const extraQty = extraMap[id] ?? 0;

                        if (extraQty < baseQty) {
                          // final < base → removed
                          return `No ${name}`;
                        } else if (extraQty > baseQty) {
                          // surplus to charge
                          const surplus = extraQty - baseQty;
                          return `+ ${name} (x${surplus})`;
                        }
                        // equal → unchanged
                        return null;
                      })
                      .filter((line) => line !== null)
                      .join('<br/>');

                    if (baseLines) {
                      modificationsHtml += `<br/>– Modified ingredients:<br/>${baseLines}`;
                    }
                  }

                  // 2) For pure extras (not in baseMap)
                  if (Array.isArray(it.extraIngredientsSnapshot)) {
                    const extraPureLines = it.extraIngredientsSnapshot
                      .map((e: any) => {
                        const id = String(e._id);
                        const name = e.name || 'Ingredient';
                        const extraQty = Number(e.quantity) || 0;
                        const baseQty = baseMap[id] ?? 0;

                        if (!baseMap[id]) {
                          return `+ ${name} (x${extraQty})`;
                        }
                        // surplus already handled above
                        return null;
                      })
                      .filter((line) => line !== null)
                      .join('<br/>');

                    if (extraPureLines) {
                      modificationsHtml += `<br/>${extraPureLines}`;
                    }
                  }

                  return `
                    <li>
                      <strong>${it.name}</strong> —
                      €${unitPrice.toFixed(2)} × ${qty} = €${lineTotal.toFixed(2)}
                      ${modificationsHtml}
                    </li>
                  `;
                })
                .join('')
            : '<li>No items found</li>'
        }
      </ul>
      <p><strong>Total amount: €${(Number(order.totalAmount) || 0).toFixed(2)}</strong></p>
      <p>Thank you for shopping with us!</p>
      <hr/>
      <p>Resto Commande</p>
    `;

      await this.mailerService.sendMail({
        to: toEmail,
        subject: `Your Order #${order._id.toString().slice(-4)} has been ${actionText}`,
        html: htmlBody,
      });

      this.logger.log(
        `Receipt email sent to ${toEmail} for order ${order._id} (${actionText})`,
      );
    } catch (err) {
      this.logger.error(`Error sending receipt email to ${toEmail}`, err.stack);
    }
  }
}
