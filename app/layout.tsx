import type {Metadata} from 'next';
import './styles.css';
export const metadata:Metadata={title:'Lunch Together Merchant · Không gian nhà hàng',description:'Quản lý thực đơn, đơn cơm và giao hàng đồng bộ với Cơm Nhà.',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>;}
