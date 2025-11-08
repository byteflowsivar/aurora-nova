# Documentación de Módulos

Esta carpeta contiene la documentación detallada para cada **módulo funcional** de la aplicación Aurora Nova. La estructura está diseñada para ser explícitamente modular, reflejando la arquitectura de la aplicación donde las funcionalidades pueden ser habilitadas o deshabilitadas a través de "feature flags".

## Estructura de un Módulo

Cada subcarpeta en este directorio representa un módulo y debe seguir una estructura consistente:

```
modules/
└── <nombre-del-modulo>/
    ├── README.md         # Visión general del módulo, su propósito y cómo habilitarlo.
    ├── guide.md          # Guía conceptual y de uso del módulo.
    ├── reference.md      # Referencia técnica (API, estructura de datos, etc.).
    └── adr/              # Decisiones de arquitectura específicas de este módulo.
```

## Módulos Disponibles

- **[auth/](./auth/)**: Módulo de Autenticación y Autorización (RBAC).
