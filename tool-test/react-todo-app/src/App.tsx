import { useState, useEffect, useRef } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  edited?: boolean;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Save to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    const newTodoItem: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
    };
    setTodos([...todos, newTodoItem]);
    setNewTodo('');
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (editText.trim() === '') return;
    setTodos(
      todos.map(todo =>
        todo.id === editingId ? { ...todo, text: editText.trim() } : todo
      )
    );
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  return (
    <div className="app">
      <div className="header">
        <h1>✨ Todo List</h1>
        <p>Stay organized and get things done!</p>
      </div>

      <div className="input-section">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new task..."
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          className="todo-input"
        />
        <button onClick={addTodo} className="add-btn">
          ➕ Add
        </button>
      </div>

      <div className="filters">
        <button 
          onClick={() => setFilter('all')} 
          className={filter === 'all' ? 'active' : ''}
        >
          All ({todos.length})
        </button>
        <button 
          onClick={() => setFilter('active')} 
          className={filter === 'active' ? 'active' : ''}
        >
          Active ({activeCount})
        </button>
        <button 
          onClick={() => setFilter('completed')} 
          className={filter === 'completed' ? 'active' : ''}
        >
          Completed ({completedCount})
        </button>
      </div>

      <div className="stats">
        <span>{activeCount} {activeCount === 1 ? 'task' : 'tasks'} left</span>
        {completedCount > 0 && <span>{completedCount} completed</span>}
      </div>

      <div className="todo-list">
        {filteredTodos.length === 0 ? (
          <p className="empty-state">No tasks found. Add one above! 🌟</p>
        ) : (
          filteredTodos.map((todo) => (
            <div 
              key={todo.id} 
              className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}`}
            >
              {editingId === todo.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    ref={inputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    className="edit-input"
                  />
                  <div className="edit-actions">
                    <button onClick={saveEdit} className="save-btn">✓ Save</button>
                    <button onClick={cancelEdit} className="cancel-btn">✕ Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <label className="todo-label">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      className="todo-checkbox"
                    />
                    <span className="todo-text">{todo.text}</span>
                  </label>
                  <div className="todo-actions">
                    <button 
                      onClick={() => startEditing(todo)} 
                      className="edit-btn"
                      aria-label="Edit todo"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => deleteTodo(todo.id)} 
                      className="delete-btn"
                      aria-label="Delete todo"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {todos.length > 0 && (
        <div className="clear-section">
          <button 
            onClick={() => setTodos(todos.filter(todo => !todo.completed))}
            className="clear-btn"
          >
            Clear Completed ({completedCount})
          </button>
        </div>
      )}
    </div>
  );
}

export default App;