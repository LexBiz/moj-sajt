# Код улучшенного AI-интерфейса для шага AI в /flow

## Описание
Этот файл содержит полный код компонента AI-чата для `/flow` (шаг `ai`).  
**Интерфейс как в ChatGPT**: история сообщений в центре, поле ввода зафиксировано внизу, кнопки всегда видны, автоскролл к новым сообщениям, быстрые вопросы сверху.

---

## Структура компонента

```typescript
// Добавить в app/flow/page.tsx в секцию case 'ai':

case 'ai':
  return (
    <div className="flex flex-col h-[600px] max-h-[80vh]">
      {/* Заголовок */}
      <div className="flex-shrink-0 pb-4 border-b border-white/10">
        <h2 className="text-2xl font-semibold text-white mb-2">
          {t.aiTitle}
        </h2>
        <p className="text-slate-300 text-sm">
          {t.aiDesc}
        </p>
      </div>

      {/* Быстрые вопросы (chips) */}
      {form.history.length === 0 && (
        <div className="flex-shrink-0 flex gap-2 flex-wrap py-3">
          {aiSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => setField('question', s)}
              className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200 hover:border-indigo-300/60 hover:bg-indigo-500/10 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* История сообщений (скроллится) */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 py-4 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {form.history.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Задай питання або натисни "Показати рішення"
          </div>
        ) : (
          form.history.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                    : 'bg-white/5 border border-white/10 text-slate-100'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="text-xs uppercase text-indigo-200 font-semibold mb-1">
                    Система
                  </div>
                )}
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Loader пока AI думает */}
        {aiLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <span className="text-slate-300 text-sm ml-2">Система аналізує...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Лимит вопросов (индикатор) */}
      {form.history.length > 0 && form.history.length < 6 && (
        <div className="flex-shrink-0 text-xs text-slate-400 py-2">
          Питань: {Math.floor(form.history.length / 2)} / 3
        </div>
      )}

      {/* Ошибка */}
      {aiError && (
        <div className="flex-shrink-0 text-red-300 text-sm py-2">
          {aiError}
        </div>
      )}

      {/* Поле ввода (зафиксировано внизу) */}
      <div className="flex-shrink-0 pt-3 border-t border-white/10">
        <div className="flex gap-2 items-end">
          <textarea
            value={form.question}
            onChange={(e) => setField('question', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAskAI()
              }
            }}
            placeholder={
              form.history.length >= 6
                ? 'Максимум 3 питання. Продовжуй до контакту.'
                : 'Введи питання або натисни "Показати рішення"'
            }
            disabled={form.history.length >= 6 || aiLoading}
            rows={2}
            className="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={handleAskAI}
            disabled={aiLoading || form.history.length >= 6 || !form.question.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
          >
            {aiLoading ? '...' : '→'}
          </button>
        </div>

        {/* Кнопки управления */}
        <div className="flex flex-wrap gap-3 items-center mt-3">
          {form.history.length === 0 && (
            <button
              onClick={handleAskAI}
              disabled={aiLoading}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-base font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg disabled:opacity-60"
            >
              {aiLoading ? 'Думаю…' : t.aiShow}
            </button>
          )}
          <button
            onClick={() => setStep('contact')}
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-all"
          >
            {t.aiContinue}
          </button>
        </div>
      </div>
    </div>
  )
```

---

## Дополнительный код (hooks и refs)

### 1. Добавить в начало компонента (после useState):

```typescript
const chatContainerRef = useRef<HTMLDivElement>(null)
```

### 2. Импортировать useRef:

```typescript
import { useMemo, useState, useRef, useEffect } from 'react'
```

### 3. Автоскролл при новом сообщении (добавить в компонент):

```typescript
// Автоскролл к последнему сообщению
useEffect(() => {
  if (chatContainerRef.current) {
    chatContainerRef.current.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }
}, [form.history.length])
```

---

## Кастомные стили для скроллбара (добавить в globals.css)

```css
/* Тонкий кастомный скроллбар для чата */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
```

---

## Логика handleAskAI (обновлённая версия)

```typescript
const handleAskAI = async () => {
  // Валидация: заполнены ли обязательные поля
  const businessResolved = (form.businessCustom || form.businessType || '').trim()
  const channelsResolved = form.channelCustom ? [form.channelCustom] : form.channels.filter(Boolean)
  const painsResolved = form.painCustom ? [form.painCustom] : form.pains.filter(Boolean)

  if (!businessResolved) {
    setAiError('Спочатку вкажіть тип бізнесу')
    return
  }
  if (channelsResolved.length === 0) {
    setAiError('Спочатку вкажіть канали')
    return
  }
  if (painsResolved.length === 0) {
    setAiError('Спочатку вкажіть біль')
    return
  }

  // Лимит 3 вопроса (6 сообщений: 3 user + 3 assistant)
  if (form.history.length >= 6) {
    setAiError('Максимум 3 питання. Якщо готово — продовжуй до контакту.')
    return
  }

  setAiError('')
  setAiLoading(true)

  try {
    const userMessage = form.question.trim() || 'Покажи рішення для мого бізнесу'

    // Добавляем сообщение пользователя в историю
    const newHistory = [...form.history, { role: 'user' as const, content: userMessage }]

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessType: businessResolved,
        channel: channelsResolved.join(', '),
        pain: painsResolved.join(', '),
        question: userMessage,
        history: newHistory,
        lang,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error('AI error')

    // Добавляем ответ AI в историю
    const updatedHistory = [
      ...newHistory,
      { role: 'assistant' as const, content: data.answer || 'Помилка отримання відповіді' },
    ]

    setForm((prev) => ({
      ...prev,
      history: updatedHistory,
      aiAnswer: data.answer || '',
      aiRecommendation: data.recommendation || data.answer || '',
      question: '', // Очищаем поле ввода
    }))
  } catch (error) {
    setAiError('Не вдалось отримати відповідь. Спробуй ще раз або продовжуй до контакту.')
  } finally {
    setAiLoading(false)
  }
}
```

---

## Итоговая структура UI:

```
┌──────────────────────────────────────────┐
│ Заголовок + описание                     │
├──────────────────────────────────────────┤
│ Быстрые вопросы (только если нет истории)│
├──────────────────────────────────────────┤
│                                          │
│  [История чата — скроллится]             │
│                                          │
│  User: питання 1                         │
│  AI:   відповідь 1                       │
│  User: питання 2                         │
│  AI:   відповідь 2 (с автоскроллом)     │
│                                          │
├──────────────────────────────────────────┤
│ Индикатор лимита (если есть история)    │
│ Ошибка (если есть)                       │
├──────────────────────────────────────────┤
│ [Textarea] + [→ кнопка отправки]         │ ← зафиксировано
│ Кнопки: "Показать решение" / "Продолжить"│
└──────────────────────────────────────────┘
```

---

## Фичи:

1. **Фиксированный ввод внизу** — не уезжает, всегда доступен.
2. **История в центре** — скроллится, автоматически прокручивается к новым сообщениям.
3. **Быстрые вопросы** — сверху, исчезают после первого сообщения.
4. **Loader** — показывается пока AI думает (3 пульсирующие точки).
5. **Лимит 3 вопроса** — индикатор внизу, блокировка ввода после 6 сообщений.
6. **Enter → отправка** — Shift+Enter для новой строки.
7. **Валидация** — не пустит к AI, пока не заполнены бизнес/каналы/боли.
8. **Языковая поддержка** — плейсхолдеры и ошибки с учётом выбранного языка.
9. **Адаптивный** — работает на мобильных (max-w 85% для сообщений).
10. **Красивый дизайн** — градиенты, тени, стеклоэффект, как в гайде.

---

## Инструкция по внедрению:

1. Открой `app/flow/page.tsx`.
2. Найди `case 'ai':`.
3. Замени содержимое этого блока на код из раздела **"Структура компонента"** выше.
4. Добавь `const chatContainerRef = useRef<HTMLDivElement>(null)` после `useState`.
5. Добавь `useEffect` для автоскролла (раздел **"Дополнительный код"**).
6. Обнови импорт: `import { useMemo, useState, useRef, useEffect } from 'react'`.
7. Добавь стили скроллбара в `app/globals.css` (раздел **"Кастомные стили"**).
8. Замени функцию `handleAskAI` на обновлённую версию из раздела **"Логика handleAskAI"**.
9. Перезапусти `npm run dev`.
10. Протестируй: http://localhost:3000/flow → дойди до AI-шага.

---

## Готово!

Теперь интерфейс как в ChatGPT: удобно, ничего не уезжает, история по центру, ввод внизу, автоскролл. 🚀

