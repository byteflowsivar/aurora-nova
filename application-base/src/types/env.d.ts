declare namespace NodeJS {
  interface ProcessEnv {
    // Base de datos
    DATABASE_URL: string;

    // Autenticación
    AUTH_SECRET: string;
    NEXTAUTH_URL: string;

    // Aplicación
    NODE_ENV: 'development' | 'production' | 'test';
    APP_NAME: string;
    APP_URL: string;

    // Logging
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';

    // Email (para Gmail)
    GMAIL_USER?: string;
    GMAIL_APP_PASSWORD?: string;

    // Email (opcional - para futuras funcionalidades)
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    FROM_EMAIL?: string;
  }
}