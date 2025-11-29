# Components

Componentes React del MarketplaceAI (EVM-only / Avalanche).

## Componentes Principales

### Layout & Navigation
- **GlobalHeaderEvm.tsx** - Header principal con navegación y wallet connect
- **TopProgressBar.tsx** - Barra de progreso de navegación
- **NavigationProgress.tsx** - Indicador de progreso de navegación

### Models
- **ModelCard.tsx** - Card para mostrar modelo en listados
- **ModelDetailView.tsx** - Vista de detalle de modelo (Step 5 style)
- **ModelDetailShared.tsx** - Componentes compartidos (Row, ChipsShort, helpers)
- **ModelEditControls.tsx** - Controles de edición para propietarios

### Wallet
- **UnifiedConnectButton.tsx** - Botón de conexión de wallet unificado
- **UnifiedConnectButtonEvm.tsx** - Implementación EVM (RainbowKit)

### IPFS & Media
- **IpfsImage.tsx** - Componente para mostrar imágenes desde IPFS
- **OptimizedImage.tsx** - Imagen optimizada con lazy loading

### Wizard (Publish Flow)
- **WizardFooter.tsx** - Footer del wizard de publicación
- **WizardThemeProvider.tsx** - Theme provider para wizard
- **QuickEditDrawer.tsx** - Drawer para edición rápida de modelo

### Form & UI
- **SelectField.tsx** - Campo select reutilizable

### Monitoring
- **WebVitals.tsx** - Reporte de Web Vitals
