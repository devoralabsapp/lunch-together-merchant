'use client';
import {createContext,useContext,useState} from 'react';
import {Palette} from 'lucide-react';
import {THEME_COOKIE,themes,parseTheme,type Theme} from '../lib/theme';
const Context=createContext<{theme:Theme;setTheme:(value:Theme)=>void}|null>(null);
export function ThemeProvider({initialTheme,children}:{initialTheme:Theme;children:React.ReactNode}){
 const [theme,setSelected]=useState(initialTheme);
 const setTheme=(value:Theme)=>{const next=parseTheme(value);setSelected(next);document.documentElement.dataset.theme=next;try{document.cookie=`${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;}catch{}};
 return <Context.Provider value={{theme,setTheme}}>{children}</Context.Provider>;
}
export function ThemeSwitcher({t}:{t:(value:string)=>string}){const value=useContext(Context);if(!value)throw Error('ThemeProvider required');return <label className="theme-switcher"><Palette size={16} aria-hidden="true"/><select aria-label={t('Chọn giao diện')} value={value.theme} onChange={e=>value.setTheme(parseTheme(e.target.value))}>{themes.map(theme=><option key={theme.id} value={theme.id}>{t(theme.label)}</option>)}</select></label>;}
