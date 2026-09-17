/**
 * Flowboard — Focus-Driven Task Manager
 * Complete Application Logic & State Management
 * Features:
 *   - Priority 1: Add/Delete/Complete with smooth CSS animations, LocalStorage, Filter tabs, Priority pills, Designed Empty States, Responsive
 *   - Priority 2: Drag & Drop reordering, Undo delete toast, Keyboard shortcuts (Ctrl+K), Inline editing, Confetti celebratory canvas, Real-time search
 */

(function () {
  'use strict';

  // =========================================================================
  // State & Constants
  // =========================================================================
  const STORAGE_KEY = 'flowboard_tasks_data';

  // Initial Sample tasks (Loaded only if local storage is completely empty)
  const INITIAL_TASKS = [
    {
      id: 'task_demo_1',
      text: 'Explore Flowboard interface & interactive features',
      completed: true,
      priority: 'low',
      dueDate: '',
      createdAt: Date.now() - 3600000
    },
    {
      id: 'task_demo_2',
      text: 'Draft design specifications for new client pitch',
      completed: false,
      priority: 'high',
      dueDate: getTodayDateString(),
      createdAt: Date.now() - 7200000
    },
    {
      id: 'task_demo_3',
      text: 'Review pull requests and run unit test suite',
      completed: false,
      priority: 'medium',
      dueDate: '',
      createdAt: Date.now() - 10800000
    }
  ];

  let tasks = [];
  let currentFilter = 'all'; // 'all' | 'active' | 'completed'
  let searchQuery = '';
  let recentlyDeleted = null; // Buffer for undo functionality
  let undoTimeout = null;

  // =========================================================================
  // DOM Element Selectors
  // =========================================================================
  const elements = {
    form: document.getElementById('add-task-form'),
    input: document.getElementById('task-input'),
    priorityPills: document.querySelectorAll('.priority-pill'),
    dateInput: document.getElementById('task-due-date'),
    dateDisplay: document.getElementById('date-display-text'),
    dateTrigger: document.getElementById('date-picker-label'),
    clearDateBtn: document.getElementById('clear-date-btn'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    taskList: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    emptyIcon: document.getElementById('empty-icon-wrapper'),
    emptyTitle: document.getElementById('empty-title'),
    emptyDesc: document.getElementById('empty-desc'),
    remainingCount: document.getElementById('remaining-count-text'),
    clearCompletedBtn: document.getElementById('clear-completed-btn'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    progressPercentage: document.getElementById('progress-percentage'),
    currentDateText: document.getElementById('current-date-text'),
    toastContainer: document.getElementById('toast-container'),
    confettiCanvas: document.getElementById('confetti-canvas')
  };

  // =========================================================================
  // Initialization
  // =========================================================================
  function init() {
    loadTasks();
    displayCurrentDate();
    initEventListeners();
    initConfettiEngine();
    render();
  }

  function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    elements.currentDateText.textContent = now.toLocaleDateString('en-US', options);
  }

  // =========================================================================
  // LocalStorage Persistence Layer
  // =========================================================================
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        tasks = JSON.parse(stored);
      } else {
        tasks = [...INITIAL_TASKS];
        saveTasks();
      }
    } catch (e) {
      console.error('Failed to load tasks from localStorage:', e);
      tasks = [...INITIAL_TASKS];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks to localStorage:', e);
    }
  }

  // =========================================================================
  // Event Listeners Setup
  // =========================================================================
  function initEventListeners() {
    // Form submission (Add task)
    elements.form.addEventListener('submit', handleAddTask);

    // Priority selector pills
    elements.priorityPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.priorityPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });

    // Due date picker listener
    elements.dateInput.addEventListener('change', handleDateChange);
    elements.clearDateBtn.addEventListener('click', clearDateSelection);

    // Filter tabs
    elements.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        elements.filterTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        currentFilter = tab.getAttribute('data-filter');
        render();
      });
    });

    // Search input
    elements.searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      elements.clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
      render();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      searchQuery = '';
      elements.clearSearchBtn.style.display = 'none';
      render();
    });

    // Clear completed tasks
    elements.clearCompletedBtn.addEventListener('click', handleClearCompleted);

    // Task list event delegation (Complete, Delete, Edit, Drag & Drop)
    elements.taskList.addEventListener('click', handleTaskListClick);
    elements.taskList.addEventListener('dblclick', handleTaskListDoubleClick);

    // Drag & Drop Delegation
    setupDragAndDrop();

    // Global keyboard shortcuts (Ctrl+K / Cmd+K)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        elements.input.focus();
        elements.input.select();
      }
    });
  }

  // =========================================================================
  // Task Actions (Add, Toggle, Delete, Clear, Edit)
  // =========================================================================
  function handleAddTask(e) {
    e.preventDefault();
    const text = elements.input.value.trim();
    if (!text) return;

    // Get selected priority
    const priorityRadio = document.querySelector('input[name="task-priority"]:checked');
    const priority = priorityRadio ? priorityRadio.value : 'medium';
    const dueDate = elements.dateInput.value || '';

    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      text: text,
      completed: false,
      priority: priority,
      dueDate: dueDate,
      createdAt: Date.now()
    };

    // Prepend new task
    tasks.unshift(newTask);
    saveTasks();

    // Reset input
    elements.input.value = '';
    clearDateSelection();
    elements.input.focus();

    // Render with new task animation
    render(newTask.id);
  }

  function handleDateChange(e) {
    const val = e.target.value;
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        elements.dateDisplay.textContent = formatted;
        elements.dateTrigger.classList.add('has-date');
        elements.clearDateBtn.style.display = 'inline-block';
      }
    } else {
      clearDateSelection();
    }
  }

  function clearDateSelection() {
    elements.dateInput.value = '';
    elements.dateDisplay.textContent = 'Due Date';
    elements.dateTrigger.classList.remove('has-date');
    elements.clearDateBtn.style.display = 'none';
  }

  function handleTaskListClick(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    const taskId = taskItem.dataset.id;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Checkbox / Toggle complete clicked
    if (e.target.closest('.custom-checkbox') || e.target.closest('.task-checkbox-wrap')) {
      toggleTaskCompletion(task, taskItem);
      return;
    }

    // Delete button clicked
    if (e.target.closest('.delete-btn')) {
      deleteTaskWithAnimation(task, taskItem);
      return;
    }

    // Edit button clicked
    if (e.target.closest('.edit-btn')) {
      startInlineEdit(task, taskItem);
      return;
    }
  }

  function toggleTaskCompletion(task, taskItem) {
    task.completed = !task.completed;
    saveTasks();

    // Visual feedback
    if (task.completed) {
      taskItem.classList.add('completed');
      triggerConfettiBurst(taskItem);
    } else {
      taskItem.classList.remove('completed');
    }

    // If currently filtering, re-render after slight delay for visual satisfaction
    if (currentFilter !== 'all') {
      setTimeout(() => {
        render();
      }, 350);
    } else {
      updateSummaryCounters();
    }
  }

  function deleteTaskWithAnimation(task, taskItem) {
    // Apply exit animation
    taskItem.classList.add('task-item-exit');

    // Store for Undo
    recentlyDeleted = {
      task: { ...task },
      index: tasks.findIndex(t => t.id === task.id)
    };

    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      render();
      showUndoToast(`Task deleted`, () => undoDelete());
    }, 280);
  }

  function undoDelete() {
    if (!recentlyDeleted) return;
    tasks.splice(recentlyDeleted.index, 0, recentlyDeleted.task);
    saveTasks();
    const restoredId = recentlyDeleted.task.id;
    recentlyDeleted = null;
    render(restoredId);
    showUndoToast('Task restored');
  }

  function handleClearCompleted() {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;

    const items = elements.taskList.querySelectorAll('.task-item.completed');
    items.forEach(item => item.classList.add('task-item-exit'));

    setTimeout(() => {
      tasks = tasks.filter(t => !t.completed);
      saveTasks();
      render();
      showUndoToast(`Cleared ${completedTasks.length} completed tasks`);
    }, 280);
  }

  // =========================================================================
  // Inline Editing
  // =========================================================================
  function handleTaskListDoubleClick(e) {
    const taskTitle = e.target.closest('.task-title');
    if (!taskTitle) return;
    const taskItem = taskTitle.closest('.task-item');
    if (!taskItem) return;
    const taskId = taskItem.dataset.id;
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      startInlineEdit(task, taskItem);
    }
  }

  function startInlineEdit(task, taskItem) {
    const textContainer = taskItem.querySelector('.task-text-container');
    const currentTitle = taskItem.querySelector('.task-title');
    if (!textContainer || !currentTitle) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    input.value = task.text;
    input.maxLength = 140;

    currentTitle.style.display = 'none';
    textContainer.insertBefore(input, currentTitle);
    input.focus();
    input.select();

    function commitEdit() {
      const newText = input.value.trim();
      if (newText && newText !== task.text) {
        task.text = newText;
        saveTasks();
      }
      cleanup();
      render();
    }

    function cleanup() {
      input.removeEventListener('blur', commitEdit);
      input.removeEventListener('keydown', handleKey);
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
      currentTitle.style.display = '';
    }

    function handleKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        cleanup();
      }
    }

    input.addEventListener('blur', commitEdit);
    input.addEventListener('keydown', handleKey);
  }

  // =========================================================================
  // Drag & Drop Functionality
  // =========================================================================
  let draggedTaskId = null;

  function setupDragAndDrop() {
    const list = elements.taskList;

    list.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.task-item');
      if (!item) return;
      draggedTaskId = item.dataset.id;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedTaskId);
    });

    list.addEventListener('dragend', (e) => {
      const item = e.target.closest('.task-item');
      if (item) {
        item.classList.remove('dragging');
      }
      list.querySelectorAll('.task-item').forEach(i => i.classList.remove('drag-over'));
      draggedTaskId = null;
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const targetItem = e.target.closest('.task-item');
      if (targetItem && targetItem.dataset.id !== draggedTaskId) {
        list.querySelectorAll('.task-item').forEach(i => i.classList.remove('drag-over'));
        targetItem.classList.add('drag-over');
      }
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetItem = e.target.closest('.task-item');
      if (!targetItem || !draggedTaskId) return;
      const targetId = targetItem.dataset.id;
      if (targetId === draggedTaskId) return;

      const fromIndex = tasks.findIndex(t => t.id === draggedTaskId);
      const toIndex = tasks.findIndex(t => t.id === targetId);

      if (fromIndex !== -1 && toIndex !== -1) {
        const [movedTask] = tasks.splice(fromIndex, 1);
        tasks.splice(toIndex, 0, movedTask);
        saveTasks();
        render();
      }
    });
  }

  // =========================================================================
  // Render Pipeline
  // =========================================================================
  function render(animatingTaskId = null) {
    // 1. Filter tasks
    const filteredTasks = tasks.filter(task => {
      // Status filter
      if (currentFilter === 'active' && task.completed) return false;
      if (currentFilter === 'completed' && !task.completed) return false;
      // Search filter
      if (searchQuery && !task.text.toLowerCase().includes(searchQuery)) return false;
      return true;
    });

    // 2. Clear existing list
    elements.taskList.innerHTML = '';

    // 3. Show/Hide Empty State
    if (filteredTasks.length === 0) {
      showEmptyState();
    } else {
      elements.emptyState.style.display = 'none';
      elements.taskList.style.display = 'flex';

      // Render Task DOM Elements
      filteredTasks.forEach(task => {
        const taskEl = createTaskElement(task);
        if (task.id === animatingTaskId) {
          taskEl.classList.add('task-item-enter');
        }
        elements.taskList.appendChild(taskEl);
      });
    }

    // 4. Update Summary Counters & Progress
    updateSummaryCounters();
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;
    li.draggable = true;

    // Date Chip info
    let dateChipHtml = '';
    if (task.dueDate) {
      const todayStr = getTodayDateString();
      let statusClass = '';
      let dateLabel = task.dueDate;
      
      const parts = task.dueDate.split('-');
      if (parts.length === 3) {
        const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
        dateLabel = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (task.dueDate < todayStr && !task.completed) {
        statusClass = 'overdue';
        dateLabel = '⚠️ ' + dateLabel;
      } else if (task.dueDate === todayStr) {
        statusClass = 'today';
        dateLabel = '⚡ Today';
      }

      dateChipHtml = `
        <span class="task-due-chip ${statusClass}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${escapeHtml(dateLabel)}
        </span>
      `;
    }

    li.innerHTML = `
      <div class="task-content-wrapper">
        <div class="drag-handle" title="Drag to reorder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1"></circle>
            <circle cx="9" cy="12" r="1"></circle>
            <circle cx="9" cy="19" r="1"></circle>
            <circle cx="15" cy="5" r="1"></circle>
            <circle cx="15" cy="12" r="1"></circle>
            <circle cx="15" cy="19" r="1"></circle>
          </svg>
        </div>
        <div class="custom-checkbox" role="checkbox" aria-checked="${task.completed}">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="task-text-container">
          <span class="task-title" title="Double click to edit">${escapeHtml(task.text)}</span>
          <div class="task-meta-row">
            <span class="task-priority-badge">${task.priority}</span>
            ${dateChipHtml}
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn edit-btn" title="Edit Task" aria-label="Edit Task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="action-btn delete-btn" title="Delete Task" aria-label="Delete Task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    return li;
  }

  function showEmptyState() {
    elements.taskList.style.display = 'none';
    elements.emptyState.style.display = 'flex';

    if (searchQuery) {
      elements.emptyIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      `;
      elements.emptyTitle.textContent = 'No matching tasks';
      elements.emptyDesc.textContent = `No tasks found matching "${searchQuery}". Try a different search term.`;
    } else if (currentFilter === 'active') {
      elements.emptyIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
      elements.emptyTitle.textContent = 'All caught up! 🎉';
      elements.emptyDesc.textContent = 'No active tasks left on your board. You are on top of everything!';
    } else if (currentFilter === 'completed') {
      elements.emptyIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
      elements.emptyTitle.textContent = 'No completed tasks yet';
      elements.emptyDesc.textContent = 'Check off tasks as you finish them to build momentum today.';
    } else {
      elements.emptyIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      `;
      elements.emptyTitle.textContent = 'Your board is clear';
      elements.emptyDesc.textContent = 'Plan less, flow more. Add your first task using the input bar above.';
    }
  }

  function updateSummaryCounters() {
    const total = tasks.length;
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;

    // Badges in tabs
    document.getElementById('count-all').textContent = total;
    document.getElementById('count-active').textContent = active;
    document.getElementById('count-completed').textContent = completed;

    // Remaining text in footer
    elements.remainingCount.textContent = `${active} ${active === 1 ? 'task' : 'tasks'} remaining`;

    // Progress bar calculations
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    elements.progressBarFill.style.width = `${percentage}%`;
    elements.progressPercentage.textContent = `${percentage}% Completed`;

    // Disable clear completed button if none completed
    elements.clearCompletedBtn.style.opacity = completed > 0 ? '1' : '0.4';
    elements.clearCompletedBtn.style.pointerEvents = completed > 0 ? 'auto' : 'none';
  }

  // =========================================================================
  // Toast & Notification Feedback
  // =========================================================================
  function showUndoToast(message, onUndo = null) {
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    elements.toastContainer.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'toast';

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (onUndo) {
      const undoBtn = document.createElement('button');
      undoBtn.className = 'toast-undo-btn';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', () => {
        onUndo();
        toast.remove();
      });
      toast.appendChild(undoBtn);
    }

    elements.toastContainer.appendChild(toast);

    undoTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // =========================================================================
  // Confetti Particle Engine (Vanilla Canvas)
  // =========================================================================
  let confettiParticles = [];
  let confettiCtx = null;
  let confettiAnimationId = null;

  function initConfettiEngine() {
    const canvas = elements.confettiCanvas;
    if (!canvas) return;
    confettiCtx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!elements.confettiCanvas) return;
    elements.confettiCanvas.width = window.innerWidth;
    elements.confettiCanvas.height = window.innerHeight;
  }

  function triggerConfettiBurst(targetElement) {
    if (!confettiCtx) return;

    const rect = targetElement ? targetElement.getBoundingClientRect() : {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      width: 0,
      height: 0
    };

    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const colors = ['#22D3EE', '#38BDF8', '#3B82F6', '#6366F1', '#10B981', '#F59E0B'];

    for (let i = 0; i < 35; i++) {
      confettiParticles.push({
        x: originX,
        y: originY,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.7) * 9,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }

    if (!confettiAnimationId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, elements.confettiCanvas.width, elements.confettiCanvas.height);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // gravity
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        confettiParticles.splice(i, 1);
        continue;
      }

      confettiCtx.save();
      confettiCtx.globalAlpha = p.alpha;
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      confettiCtx.restore();
    }

    if (confettiParticles.length > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
      confettiAnimationId = null;
    }
  }

  // =========================================================================
  // Utilities
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // =========================================================================
  // Start the Application
  // =========================================================================
  document.addEventListener('DOMContentLoaded', init);
})();
