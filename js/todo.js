// ========== TODO LIST APP ==========

/**
 * TO-DO LIST MODULE
 * Task management with priorities, due dates, tags, and subtasks
 */

// ============================================
// TODO STATE
// ============================================

let todoList = [];               // All tasks
let currentEditingTodoId = null; // ID of task being edited
let todoFilterPriority = 'all';  // Filter by priority level

/**
 * Load all todos from Firestore
 */
async function loadTodoList() {
  if (!auth.currentUser) return;
  const snap = await db.collection("user_data").doc(auth.currentUser.uid).get();
  const data = snap.exists ? snap.data() : {};
  todoList = Array.isArray(data.todos) ? data.todos : [];
  renderTodoList();
}

/**
 * Save all todos to Firestore
 */
async function saveTodoList() {
  if (!auth.currentUser) return;
  await db.collection("user_data").doc(auth.currentUser.uid).set({ todos: todoList }, { merge: true });
}

async function addTodo() {
  const title = (safeEl("todo-title")?.value || "").trim();
  const description = (safeEl("todo-description")?.value || "").trim();
  const subject = (safeEl("todo-subject")?.value || "").trim();
  const dueDate = safeEl("todo-due-date")?.value || "";
  const priority = safeEl("todo-priority")?.value || "Medium";

  if (!title) return alert("Please enter a task title.");

  todoList.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title, description, subject, dueDate, priority, completed: false
  });

  if (safeEl("todo-title")) safeEl("todo-title").value = "";
  if (safeEl("todo-description")) safeEl("todo-description").value = "";
  if (safeEl("todo-subject")) safeEl("todo-subject").value = "";
  if (safeEl("todo-due-date")) safeEl("todo-due-date").value = "";
  if (safeEl("todo-priority")) safeEl("todo-priority").value = "Medium";

  await saveTodoList();
  renderTodoList();
}

async function removeTodo(id) {
  todoList = todoList.filter((t) => t.id !== id);
  await saveTodoList();
  renderTodoList();
}

async function toggleTodoComplete(id) {
  const todo = todoList.find((t) => t.id === id);
  if (todo) {
    const wasCompleted = !!todo.completed;
    todo.completed = !todo.completed;
    await saveTodoList();
    renderTodoList();
    if (!wasCompleted && todo.completed) {
      await logTaskComplete(1);
    }
  }
}

function renderTodoList() {
  const list = safeEl("todo-list");
  if (!list) return;
  list.innerHTML = "";
  
  let filtered = todoList.slice();
  
  const statusFilter = safeEl('todo-filter-status')?.value || 'all';
  const today = new Date().toISOString().split('T')[0];
  
  if (statusFilter === 'active') {
    filtered = filtered.filter(t => !t.completed);
  } else if (statusFilter === 'completed') {
    filtered = filtered.filter(t => t.completed);
  } else if (statusFilter === 'overdue') {
    filtered = filtered.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  }
  
  if (todoFilterPriority !== 'all') {
    filtered = filtered.filter(t => t.priority === todoFilterPriority);
  }
  
  const searchTerm = (safeEl('todo-search')?.value || '').toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(t => 
      (t.title || '').toLowerCase().includes(searchTerm) ||
      (t.description || '').toLowerCase().includes(searchTerm) ||
      (t.subject || '').toLowerCase().includes(searchTerm) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  const sortBy = safeEl('todo-sort')?.value || 'dueDate';
  filtered.sort((a, b) => {
    if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    } else if (sortBy === 'priority') {
      const pOrder = { High: 0, Medium: 1, Low: 2 };
      return pOrder[a.priority] - pOrder[b.priority];
    } else if (sortBy === 'created') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    } else if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });
  
  updateTodoStats();
  
  if (!filtered.length) {
    list.innerHTML = "<div style='color:#888;padding:40px;text-align:center;'>No tasks found. Create one to get started!</div>";
    return;
  }
  
  filtered.forEach(todo => {
    const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < today;
    
    const row = document.createElement('div');
    row.className = 'todo-item-enhanced';
    if (todo.completed) row.classList.add('completed');
    if (isOverdue) row.classList.add('overdue');
    
    const header = document.createElement('div');
    header.className = 'todo-item-header';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-item-checkbox';
    checkbox.checked = todo.completed;
    checkbox.onchange = () => toggleTodoComplete(todo.id);
    header.appendChild(checkbox);
    
    const content = document.createElement('div');
    content.className = 'todo-item-content';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'todo-item-title';
    if (todo.completed) titleDiv.classList.add('completed');
    titleDiv.innerText = todo.title;
    content.appendChild(titleDiv);
    
    if (todo.description) {
      const descDiv = document.createElement('div');
      descDiv.className = 'todo-item-description';
      descDiv.innerText = todo.description;
      content.appendChild(descDiv);
    }
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'todo-item-meta';
    if (todo.subject) metaDiv.innerHTML += `<span>📚 ${todo.subject}</span>`;
    if (todo.dueDate) {
      const dueText = isOverdue ? `⚠️ Overdue: ${todo.dueDate}` : `📅 Due: ${todo.dueDate}`;
      metaDiv.innerHTML += `<span style='color:${isOverdue ? "#ff6b6b" : "inherit"}'>${dueText}</span>`;
    }
    if (metaDiv.innerHTML) content.appendChild(metaDiv);
    
    if (todo.tags && todo.tags.length > 0) {
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'todo-item-tags';
      todo.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'todo-tag';
        tagSpan.innerText = tag;
        tagsDiv.appendChild(tagSpan);
      });
      content.appendChild(tagsDiv);
    }
    
    if (todo.subtasks && todo.subtasks.length > 0) {
      const subtasksDiv = document.createElement('div');
      subtasksDiv.className = 'todo-subtasks';
      const completedCount = todo.subtasks.filter(s => s.completed).length;
      const totalCount = todo.subtasks.length;
      subtasksDiv.innerHTML = `<div style='margin-bottom:4px;font-size:11px;color:#666;'>Subtasks: ${completedCount}/${totalCount}</div>`;
      todo.subtasks.forEach(subtask => {
        const stDiv = document.createElement('div');
        stDiv.className = 'todo-subtask';
        const stCheck = document.createElement('input');
        stCheck.type = 'checkbox';
        stCheck.checked = subtask.completed;
        stCheck.onchange = () => toggleSubtask(todo.id, subtask.id);
        stDiv.appendChild(stCheck);
        const stText = document.createElement('span');
        stText.innerText = subtask.text;
        if (subtask.completed) stText.style.textDecoration = 'line-through';
        stDiv.appendChild(stText);
        subtasksDiv.appendChild(stDiv);
      });
      content.appendChild(subtasksDiv);
    }
    
    header.appendChild(content);
    
    const priorityBadge = document.createElement('span');
    priorityBadge.className = `todo-priority-badge todo-priority-${todo.priority.toLowerCase()}`;
    priorityBadge.innerText = todo.priority;
    header.appendChild(priorityBadge);
    
    row.appendChild(header);
    
    const actions = document.createElement('div');
    actions.className = 'todo-item-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'todo-btn-edit';
    editBtn.innerText = '✏️ Edit';
    editBtn.onclick = () => editTodo(todo.id);
    actions.appendChild(editBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-btn-delete';
    deleteBtn.innerText = '🗑️ Delete';
    deleteBtn.onclick = () => removeTodo(todo.id);
    actions.appendChild(deleteBtn);
    
    row.appendChild(actions);
    list.appendChild(row);
  });
}

// ========== ENHANCED TODO FUNCTIONS ==========

function toggleTodoForm() {
  const modal = safeEl('todo-form-modal');
  if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
  currentEditingTodoId = null;
  clearTodoForm();
}

function closeTodoForm() {
  const modal = safeEl('todo-form-modal');
  if (modal) modal.style.display = 'none';
  currentEditingTodoId = null;
  clearTodoForm();
}

function clearTodoForm() {
  if (safeEl('todo-title')) safeEl('todo-title').value = '';
  if (safeEl('todo-description')) safeEl('todo-description').value = '';
  if (safeEl('todo-subject')) safeEl('todo-subject').value = '';
  if (safeEl('todo-due-date')) safeEl('todo-due-date').value = '';
  if (safeEl('todo-priority')) safeEl('todo-priority').value = 'Medium';
  if (safeEl('todo-tags')) safeEl('todo-tags').value = '';
  if (safeEl('todo-subtasks')) safeEl('todo-subtasks').value = '';
}

async function saveTodo() {
  const title = (safeEl('todo-title')?.value || '').trim();
  const description = (safeEl('todo-description')?.value || '').trim();
  const subject = (safeEl('todo-subject')?.value || '').trim();
  const dueDate = safeEl('todo-due-date')?.value || '';
  const priority = safeEl('todo-priority')?.value || 'Medium';
  const tagsInput = (safeEl('todo-tags')?.value || '').trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  const subtasksInput = (safeEl('todo-subtasks')?.value || '').trim();
  const subtasks = subtasksInput ? subtasksInput.split('\n').map(s => {
    const text = s.trim().replace(/^-\s*/, '');
    return text ? { text, completed: false, id: `${Date.now()}_${Math.random().toString(36).slice(2, 4)}` } : null;
  }).filter(Boolean) : [];

  if (!title) return alert('Please enter a task title.');

  if (currentEditingTodoId) {
    const todo = todoList.find(t => t.id === currentEditingTodoId);
    if (todo) {
      todo.title = title;
      todo.description = description;
      todo.subject = subject;
      todo.dueDate = dueDate;
      todo.priority = priority;
      todo.tags = tags;
      todo.subtasks = subtasks;
    }
  } else {
    todoList.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title, description, subject, dueDate, priority, tags, subtasks,
      completed: false,
      createdAt: Date.now()
    });
  }

  await saveTodoList();
  renderTodoList();
  closeTodoForm();
}

function editTodo(id) {
  const todo = todoList.find(t => t.id === id);
  if (!todo) return;
  
  currentEditingTodoId = id;
  if (safeEl('todo-title')) safeEl('todo-title').value = todo.title || '';
  if (safeEl('todo-description')) safeEl('todo-description').value = todo.description || '';
  if (safeEl('todo-subject')) safeEl('todo-subject').value = todo.subject || '';
  if (safeEl('todo-due-date')) safeEl('todo-due-date').value = todo.dueDate || '';
  if (safeEl('todo-priority')) safeEl('todo-priority').value = todo.priority || 'Medium';
  if (safeEl('todo-tags')) safeEl('todo-tags').value = (todo.tags || []).join(', ');
  if (safeEl('todo-subtasks')) safeEl('todo-subtasks').value = (todo.subtasks || []).map(s => `- ${s.text}`).join('\n');
  
  const modal = safeEl('todo-form-modal');
  if (modal) modal.style.display = 'flex';
  const title = safeEl('todo-form-title');
  if (title) title.innerText = 'Edit Task';
}

async function toggleSubtask(todoId, subtaskId) {
  const todo = todoList.find(t => t.id === todoId);
  if (!todo || !todo.subtasks) return;
  
  const subtask = todo.subtasks.find(s => s.id === subtaskId);
  if (subtask) {
    subtask.completed = !subtask.completed;
    await saveTodoList();
    renderTodoList();
  }
}

function updateTodoStats() {
  const total = todoList.length;
  const completed = todoList.filter(t => t.completed).length;
  const active = total - completed;
  const today = new Date().toISOString().split('T')[0];
  const overdue = todoList.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
  
  if (safeEl('todo-stat-total')) safeEl('todo-stat-total').innerText = total;
  if (safeEl('todo-stat-active')) safeEl('todo-stat-active').innerText = active;
  if (safeEl('todo-stat-completed')) safeEl('todo-stat-completed').innerText = completed;
  if (safeEl('todo-stat-overdue')) safeEl('todo-stat-overdue').innerText = overdue;
  
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const fill = safeEl('todo-progress-fill');
  const text = safeEl('todo-progress-text');
  if (fill) fill.style.width = percent + '%';
  if (text) text.innerText = `${percent}% Complete (${completed}/${total})`;
}

function filterTodos() {
  renderTodoList();
}

function sortTodos() {
  renderTodoList();
}

function filterByPriority(priority) {
  todoFilterPriority = priority;
  document.querySelectorAll('.tag-filter').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-priority') === priority);
  });
  renderTodoList();
}

async function clearCompletedTodos() {
  if (!confirm('Are you sure you want to delete all completed tasks?')) return;
  todoList = todoList.filter(t => !t.completed);
  await saveTodoList();
  renderTodoList();
}

function exportTodos() {
  const data = todoList.map(t => ({
    title: t.title,
    description: t.description || '',
    subject: t.subject || '',
    dueDate: t.dueDate || '',
    priority: t.priority,
    completed: t.completed,
    tags: (t.tags || []).join(', '),
    subtasks: (t.subtasks || []).map(s => s.text).join('; ')
  }));
  
  const csv = [
    ['Title', 'Description', 'Subject', 'Due Date', 'Priority', 'Completed', 'Tags', 'Subtasks'],
    ...data.map(row => [
      row.title, row.description, row.subject, row.dueDate, 
      row.priority, row.completed, row.tags, row.subtasks
    ])
  ].map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `focusflow-tasks-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
