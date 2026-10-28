import type {Metadata} from 'next';
import {cookies} from 'next/headers';
import {THEME_COOKIE,parseTheme} from '../lib/theme';
import {ThemeProvider} from './theme-provider';
import './styles.css';
import './themes.css';
export const metadata:Metadata={title:'Lunch Together Merchant · Không gian nhà hàng',description:'Quản lý thực đơn, đơn cơm và giao hàng đồng bộ với Cơm Nhà.',robots:{index:false,follow:false}};
export default async function Layout({children}:{children:React.ReactNode}){const theme=parseTheme((await cookies()).get(THEME_COOKIE)?.value);return <html lang="vi" data-theme={theme}><body><ThemeProvider initialTheme={theme}>{children}</ThemeProvider></body></html>;}
