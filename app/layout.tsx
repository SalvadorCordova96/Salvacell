import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Salvacel · Control del taller',description:'Órdenes de reparación, presupuestos y cobros de Salvacel.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>;}
