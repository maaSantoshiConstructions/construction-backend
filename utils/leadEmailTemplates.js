/**
 * Helper utilities for lead email templates and HTML formatting.
 */

/**
 * Generates HTML email template for new lead inquiry confirmation.
 * @param {Object} options - { leadName, requirement }
 * @returns {string} HTML string
 */
export const getInquiryEmailHtml = ({ leadName, requirement }) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
    <h2 style="color: #c29b38; margin-bottom: 16px;">Inquiry Received</h2>
    <p>Dear <strong>${leadName}</strong>,</p>
    <p>Thank you for contacting Maa Santoshi Constructions. We have received your request regarding <strong>${requirement || 'our property projects'}</strong>.</p>
    <p>Our sales executive will get in touch with you shortly.</p>
    <br/>
    <p style="color: #666; font-size: 14px;">Best regards,<br/><strong>Maa Santoshi Constructions Team</strong></p>
  </div>
`;

/**
 * Generates HTML email table card for attached documents (mobile responsive).
 * @param {string} docTitle 
 * @returns {string} HTML string
 */
export const getAttachmentCardHtml = (docTitle) => `
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #fcf8ee; border: 1px solid #e9d5a1; border-radius: 8px;">
    <tr>
      <td style="padding: 16px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="36" valign="top" style="font-size: 24px; line-height: 28px; padding-right: 12px;">
              📌
            </td>
            <td valign="top">
              <div style="color: #c29b38; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                Attached Document
              </div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600; line-height: 20px; word-break: break-all;">
                ${docTitle}
              </div>
              <div style="color: #64748b; font-size: 12px; margin-top: 4px;">
                File attached directly to this email message.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

/**
 * Generates HTML email body for lead follow-ups.
 * @param {Object} options - { leadName, message, documentHtml }
 * @returns {string} HTML string
 */
export const getFollowupEmailHtml = ({ leadName, message, documentHtml = '' }) => `
  <div style="font-family: Arial, sans-serif; padding: 24px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
    <div style="border-bottom: 2px solid #c29b38; padding-bottom: 12px; margin-bottom: 20px;">
      <h2 style="color: #c29b38; margin: 0; font-size: 22px;">Maa Santoshi Constructions</h2>
      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Premium Real Estate & Plotted Developments</p>
    </div>

    <p>Dear <strong>${leadName}</strong>,</p>

    <div style="margin: 16px 0; padding: 16px; background: #f8fafc; border-left: 4px solid #c29b38; border-radius: 4px; line-height: 1.6;">
      ${message}
    </div>

    ${documentHtml}

    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0;">Best regards,<br/><strong style="color: #1e293b;">Maa Santoshi Constructions Team</strong></p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Phone: +91 98765 43210 | Email: support@maasantoshiconstructions.com</p>
    </div>
  </div>
`;
