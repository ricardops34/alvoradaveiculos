import nodemailer from 'nodemailer';
import pool from '../db';

interface EmailAttachment {
  filename: string;
  contentBase64: string; // PDF gerado no navegador (jsPDF), enviado como data URI ou base64 puro
}

interface EnviarEmailParams {
  destinatario: string;
  assunto: string;
  corpo: string;
  anexo?: EmailAttachment;
}

// Credenciais de SMTP ficam na tabela `parametros` (configuradas pelo Administrador em
// Configurações > E-mail), não em variável de ambiente — cada instalação da loja pode usar
// seu próprio provedor (Gmail, SendGrid, etc.).
async function getSmtpConfig() {
  const result = await pool.query(
    'SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from FROM parametros WHERE id = 1'
  );
  const row = result.rows[0];
  if (!row?.smtp_host || !row?.smtp_user || !row?.smtp_pass) {
    throw new Error('SMTP não configurado. Configure o e-mail em Configurações > E-mail antes de enviar.');
  }
  return row;
}

function buildTransporter(config: any) {
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port || 587,
    secure: config.smtp_port === 465,
    auth: { user: config.smtp_user, pass: config.smtp_pass }
  });
}

export async function enviarEmail({ destinatario, assunto, corpo, anexo }: EnviarEmailParams) {
  const config = await getSmtpConfig();
  const transporter = buildTransporter(config);

  const attachments = anexo
    ? [{
        filename: anexo.filename,
        // aceita tanto "data:application/pdf;base64,XXXX" (saída padrão do jsPDF) quanto base64 puro
        content: anexo.contentBase64.includes('base64,') ? anexo.contentBase64.split('base64,')[1] : anexo.contentBase64,
        encoding: 'base64' as const
      }]
    : [];

  await transporter.sendMail({
    from: config.smtp_from || config.smtp_user,
    to: destinatario,
    subject: assunto,
    html: corpo,
    attachments
  });
}

export async function testarSmtp(destinatario: string) {
  const config = await getSmtpConfig();
  const transporter = buildTransporter(config);
  await transporter.verify();
  await transporter.sendMail({
    from: config.smtp_from || config.smtp_user,
    to: destinatario,
    subject: 'Alvorada CRM — Teste de configuração de e-mail',
    html: '<p>Se você recebeu esta mensagem, as configurações de SMTP do sistema estão corretas.</p>'
  });
}
