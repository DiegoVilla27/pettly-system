# Pettly Mobile

App base Flutter para Android e iOS. Requiere Flutter 3.41.4 (Dart 3.11.1), Android SDK para Android y Xcode para iOS.

Desde la raíz del monorepo:

```sh
pnpm nx run mobile:pub-get
pnpm dev:mobile
pnpm check:mobile
pnpm nx run mobile:format-check
pnpm build:mobile:android
pnpm build:mobile:ios
```

Para elegir un dispositivo: `pnpm nx serve mobile --args="-d DEVICE_ID"`.
Consulta los dispositivos disponibles con `flutter devices`.
La compilación Android genera un APK de desarrollo; la de iOS usa el simulador y no requiere firma para distribución.
Flutter gestiona las dependencias Dart con `pubspec.yaml` y `pubspec.lock`; pnpm gestiona Nx y el resto del monorepo.
El identificador generado usa `com.pettly` como base y puede ajustarse antes de publicar.
