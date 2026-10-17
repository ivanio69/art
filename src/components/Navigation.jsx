import { Home, BookOpen, Grid2X2, ChartNoAxesCombined } from 'lucide-react';

const items = [
  { id: 'home', label: 'Главная', Icon: Home },
  { id: 'study', label: 'Обучение', Icon: BookOpen },
  { id: 'gallery', label: 'Галерея', Icon: Grid2X2 },
  { id: 'history', label: 'Результаты', Icon: ChartNoAxesCombined },
];
export default function Navigation({ page, onNavigate }) {
  return <nav className="primary-navigation" aria-label="Основная навигация">
    {items.map(({ id, label, Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => onNavigate(id)}><Icon size={19} /><span>{label}</span></button>)}
  </nav>;
}
