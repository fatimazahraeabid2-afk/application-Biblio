import nodemailer from 'nodemailer';

export interface OverdueBookInfo {
  title: string;
  dueDate: string;
  daysOverdue: number;
}

export interface SendEmailPayload {
  studentName: string;
  studentEmail: string;
  type: 'announcement' | 'warning';
  books: OverdueBookInfo[];
  lang: 'fr' | 'ar';
}

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && host.trim().length > 0 && user && user.trim().length > 0 && pass);
}

function getTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function formatEmailContent(payload: SendEmailPayload): { subject: string; text: string; html: string } {
  const isArabic = payload.lang === 'ar';
  const fromName = isArabic ? 'مكتبة جامعة سيدي محمد بن عبد الله (USMBA)' : 'Bibliothèque Universitaire USMBA';

  if (payload.type === 'announcement') {
    if (isArabic) {
      const subject = `[تذكير] تأخر في إرجاع كتب مستعارة - ${fromName}`;
      const bookRows = payload.books
        .map(
          (b) =>
            `- عنوان الكتاب: ${b.title} | تاريخ الإرجاع المحدد: ${b.dueDate} | مدة التأخير: ${b.daysOverdue} يوم`
        )
        .join('\n');

      const text = `السلام عليكم ورحمة الله وبركاته،\n\nعزيزي الطالب / عزيزتي الطالبة: ${payload.studentName}\n\nنود تذكيركم بأن لديكم كتباً مستعارة من مكتبة الجامعة تجاوزت التاريخ المحدد للإرجاع:\n\n${bookRows}\n\nيرجى التوجه إلى إدارة المكتبة في أقرب وقت ممكن لإرجاع هذه الكتب وتسوية وضعيتكم لتمكين زملائكم من الاستفادة منها.\n\nمع خالص التحيات،\nإدارة المكتبة - جامعة سيدي محمد بن عبد الله`;

      const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">تذكير بتأخر إرجاع الكتب</h2>
          <p>السلام عليكم ورحمة الله وبركاته،</p>
          <p>عزيزي الطالب / عزيزتي الطالبة <strong>${payload.studentName}</strong>،</p>
          <p>نحيطكم علماً بأنكم لم تقوموا بإرجاع الكتب المستعارة التالية في موعدها المحدد:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: right;">
                <th style="padding: 8px; border: 1px solid #cbd5e1;">عنوان الكتاب</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">تاريخ الإرجاع المحدد</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">التأخير</th>
              </tr>
            </thead>
            <tbody>
              ${payload.books
                .map(
                  (b) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>${b.title}</strong></td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${b.dueDate}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1; color: #b91c1c;">${b.daysOverdue} يوم</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
          <p>نرجو منكم الحضور إلى مصلحة الإعارة بالمكتبة لتسليم الكتب في أقرب الآجال.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">مكتبة جامعة سيدي محمد بن عبد الله - فاس</p>
        </div>
      `;
      return { subject, text, html };
    } else {
      const subject = `[Rappel] Retard de restitution d'ouvrages - ${fromName}`;
      const bookRows = payload.books
        .map(
          (b) =>
            `- Titre : ${b.title} | Date prévue : ${b.dueDate} | Retard : ${b.daysOverdue} jour(s)`
        )
        .join('\n');

      const text = `Bonjour ${payload.studentName},\n\nNous vous informons que vous avez un ou plusieurs livres empruntés auprès de la bibliothèque dont la date de retour est échue :\n\n${bookRows}\n\nNous vous prions de bien vouloir restituer ces documents dans les plus brefs délais afin de permettre aux autres étudiants d'y accéder.\n\nCordialement,\nService de la Bibliothèque - Université Sidi Mohamed Ben Abdellah`;

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Rappel : Retard de restitution d'ouvrages</h2>
          <p>Bonjour <strong>${payload.studentName}</strong>,</p>
          <p>Nous vous informons que vous n'avez pas restitué dans les délais les ouvrages suivants :</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 8px; border: 1px solid #cbd5e1;">Titre de l'ouvrage</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">Date de retour prévue</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">Retard</th>
              </tr>
            </thead>
            <tbody>
              ${payload.books
                .map(
                  (b) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>${b.title}</strong></td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1;">${b.dueDate}</td>
                  <td style="padding: 8px; border: 1px solid #cbd5e1; color: #b91c1c; font-weight: bold;">${b.daysOverdue} jour(s)</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
          <p>Merci de vous présenter au guichet de la bibliothèque afin de régulariser votre situation.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">Bibliothèque de l'Université Sidi Mohamed Ben Abdellah - Fès</p>
        </div>
      `;
      return { subject, text, html };
    }
  } else {
    // Type: Warning (Avertissement)
    if (isArabic) {
      const subject = `[إنذار رسمي] استمرار تأخر إرجاع الكتب - ${fromName}`;
      const bookRows = payload.books
        .map(
          (b) =>
            `- عنوان الكتاب: ${b.title} | تاريخ الإرجاع الأصلي: ${b.dueDate} | مدة التأخير: ${b.daysOverdue} يوم`
        )
        .join('\n');

      const text = `السلام عليكم ورحمة الله وبركاته،\n\nإلى الطالب / الطالبة: ${payload.studentName}\n\nنظراً لعدم استجابتكم للتذكير الأول الصادر منذ أكثر من سبعة أيام، ونظراً لاستمرار حيازتكم للكتب المستعارة دون مسوغ قانوني:\n\n${bookRows}\n\nنحيطكم علماً بأن استمرار هذا التأخير قد يعرضكم لإجراءات إدارية أو تتبعات تأديبية وقانونية وفقاً للنظام الداخلي للجامعة وضوابط مصلحة المكتبات.\n\nنلزمكم بإرجاع الكتب فوراً إلى إدارة المكتبة لتفادي هذه الإجراءات.\n\nإدارة المكتبة - جامعة سيدي محمد بن عبد الله`;

      const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #7f1d1d; max-width: 600px; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; background-color: #fef2f2;">
          <h2 style="color: #991b1b; border-bottom: 2px solid #f87171; padding-bottom: 10px;">إنذار رسمي باستمرار تأخر إرجاع الكتب</h2>
          <p>إلى الطالب / الطالبة <strong>${payload.studentName}</strong>،</p>
          <p>نظراً لعدم استجابتكم للتذكير الأول المرسل إليكم منذ أكثر من سبعة أيام، ولعدم إرجاعكم الكتب المستعارة حتى الآن:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #fee2e2; text-align: right;">
                <th style="padding: 8px; border: 1px solid #fca5a5;">عنوان الكتاب</th>
                <th style="padding: 8px; border: 1px solid #fca5a5;">تاريخ الإرجاع المحدد</th>
                <th style="padding: 8px; border: 1px solid #fca5a5;">إجمالي التأخير</th>
              </tr>
            </thead>
            <tbody>
              ${payload.books
                .map(
                  (b) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #fca5a5;"><strong>${b.title}</strong></td>
                  <td style="padding: 8px; border: 1px solid #fca5a5;">${b.dueDate}</td>
                  <td style="padding: 8px; border: 1px solid #fca5a5; color: #dc2626; font-weight: bold;">${b.daysOverdue} يوم</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
          <p style="font-weight: bold; color: #991b1b;">
            نحيطكم علماً بأن استمرار هذا التأخير قد يعرضكم لتبعات إدارية أو إجراءات تأديبية وقانونية وفقاً للنظام الداخلي للجامعة وقواعد المكتبة المعمول بها.
          </p>
          <p>يجب التوجه فوراً وبشكل عاجل إلى إدارة المكتبة لتسليم هذه الكتب.</p>
          <hr style="border: none; border-top: 1px solid #fca5a5; margin: 20px 0;" />
          <p style="font-size: 12px; color: #991b1b;">إدارة مكتبة جامعة سيدي محمد بن عبد الله - فاس</p>
        </div>
      `;
      return { subject, text, html };
    } else {
      const subject = `[Avertissement Formel] Persistance du retard de restitution - ${fromName}`;
      const bookRows = payload.books
        .map(
          (b) =>
            `- Titre : ${b.title} | Date prévue initiale : ${b.dueDate} | Retard : ${b.daysOverdue} jour(s)`
        )
        .join('\n');

      const text = `AVERTISSEMENT FORMEL\n\nDestinataire : ${payload.studentName}\n\nFaisant suite à notre premier rappel resté sans effet depuis plus de sept jours, nous constatons que les ouvrages suivants ne sont toujours pas restitués :\n\n${bookRows}\n\nNous vous informons formellement que la persistance de ce retard peut entraîner des conséquences administratives ou juridiques selon les règles applicables et le règlement intérieur de la bibliothèque universitaire.\n\nVous êtes mis en demeure de rapporter sans délai ces documents au guichet de la bibliothèque.\n\nDirection de la Bibliothèque - Université Sidi Mohamed Ben Abdellah`;

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #7f1d1d; max-width: 600px; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; background-color: #fef2f2;">
          <h2 style="color: #991b1b; border-bottom: 2px solid #f87171; padding-bottom: 10px;">Avertissement Formel de Retard</h2>
          <p>À l'attention de l'étudiant(e) <strong>${payload.studentName}</strong>,</p>
          <p>Malgré un premier rappel envoyé il y a plus de sept jours, les ouvrages suivants sont toujours en votre possession :</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #fee2e2; text-align: left;">
                <th style="padding: 8px; border: 1px solid #fca5a5;">Titre de l'ouvrage</th>
                <th style="padding: 8px; border: 1px solid #fca5a5;">Date de retour prévue</th>
                <th style="padding: 8px; border: 1px solid #fca5a5;">Retard accumulé</th>
              </tr>
            </thead>
            <tbody>
              ${payload.books
                .map(
                  (b) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #fca5a5;"><strong>${b.title}</strong></td>
                  <td style="padding: 8px; border: 1px solid #fca5a5;">${b.dueDate}</td>
                  <td style="padding: 8px; border: 1px solid #fca5a5; color: #dc2626; font-weight: bold;">${b.daysOverdue} jour(s)</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
          <p style="font-weight: bold; color: #991b1b;">
            La persistance de ce retard peut entraîner des conséquences administratives ou juridiques selon les règles applicables et le règlement de la bibliothèque universitaire.
          </p>
          <p>Vous êtes tenu de vous présenter immédiatement au service de prêt pour restituer ces ouvrages.</p>
          <hr style="border: none; border-top: 1px solid #fca5a5; margin: 20px 0;" />
          <p style="font-size: 12px; color: #991b1b;">Bibliothèque de l'Université Sidi Mohamed Ben Abdellah - Fès</p>
        </div>
      `;
      return { subject, text, html };
    }
  }
}

export async function sendOverdueEmail(payload: SendEmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      error:
        'Le service d’envoi d’e-mails n’est pas configuré sur le serveur. Veuillez définir les variables d’environnement SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) dans .env.',
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      error: 'Impossible d’initialiser le service SMTP.',
    };
  }

  const { subject, text, html } = formatEmailContent(payload);
  const from = process.env.SMTP_FROM || 'bibliotheque@usmba.ac.ma';

  try {
    await transporter.sendMail({
      from,
      to: payload.studentEmail,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erreur lors de la transmission SMTP.',
    };
  }
}
