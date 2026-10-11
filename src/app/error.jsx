'use client';
export default function AppError({ reset }) {
  return <main className="crash"><h1>Не удалось открыть приложение</h1><p>Попробуйте ещё раз. Сохранённые данные останутся в браузере.</p><button className="button primary" onClick={reset}>Попробовать снова</button></main>;
}
