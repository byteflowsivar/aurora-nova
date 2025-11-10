// /application-base/src/lib/email/templates/password-reset.tsx
import * as React from 'react';

interface PasswordResetEmailProps {
  resetLink: string;
}

export const PasswordResetEmail: React.FC<Readonly<PasswordResetEmailProps>> = ({
  resetLink,
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
    <h1 style={{ color: '#007bff' }}>Restablece tu contraseña</h1>
    <p>
      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Aurora Nova.
    </p>
    <p>
      Haz clic en el siguiente botón para establecer una nueva contraseña. Si no solicitaste esto, puedes ignorar este correo.
    </p>
    <a
      href={resetLink}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        margin: '20px 0',
        backgroundColor: '#007bff',
        color: '#ffffff',
        textDecoration: 'none',
        borderRadius: '5px',
        fontWeight: 'bold',
      }}
    >
      Restablecer Contraseña
    </a>
    <p style={{ fontSize: '12px', color: '#666' }}>
      Este enlace expirará en 30 minutos.
    </p>
    <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
    <p style={{ fontSize: '12px', color: '#999' }}>
      Si no puedes hacer clic en el botón, copia y pega la siguiente URL en tu navegador:
      <br />
      <a href={resetLink} style={{ color: '#007bff', wordBreak: 'break-all' }}>{resetLink}</a>
    </p>
  </div>
);
