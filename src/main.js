import {start} from './pilot-ui.js';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import './style.css';
const initial = [
{id:1,name:'Papelaria Horizonte',address:'Rua Voluntários da Franca, 1200 · Centro',type:'Comércio',window:'09:00–12:00',package:'A01',status:'pending',x:44,y:37},
{id:2,name:'Marina Oliveira',address:'Rua General Telles, 900 · Centro',type:'Residência',window:'09:00–18:00',package:'A02',status:'pending',x:62,y:48},
{id:3,name:'Ateliê dos Calçados',address:'Av. Presidente Vargas, 800 · Cidade Nova',type:'Comércio',window:'10:00–17:00',package:'A03',status:'pending',x:71,y:66},
{id:4,name:'Rafael Santos',address:'Rua Saldanha Marinho, 1100 · Centro',type:'Residência',window:'09:00–18:00',package:'A04',status:'pending',x:38,y:73},
{id:5,name:'Café da Esquina',address:'Rua do Comércio, 600 · Centro',type:'Comércio',window:'09:00–16:00',package:'A05',status:'pending',x:26,y:53}
];
start(initial);
import './pilot.css';
import './intake.css';
