// ============================================
// DB — Supabase client & all data operations
// ============================================

let _supabase = null;

const DB = {
  init() {
    const { supabaseUrl, supabaseKey } = Config.get();
    if (!supabaseUrl || !supabaseKey) return false;
    try {
      _supabase = supabase.createClient(supabaseUrl, supabaseKey);
      return true;
    } catch (e) {
      console.error('Supabase init error:', e);
      return false;
    }
  },

  get client() { return _supabase; },

  // ---- AUTH / USER ----
  async getOrCreateUser(name) {
    // For single-user app: use a fixed user row or create one
    const { data, error } = await _supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      Config.save({ userId: data.id });
      return data;
    }

    // Create user
    const { data: newUser, error: createErr } = await _supabase
      .from('users')
      .insert({ name, email: `${name.toLowerCase()}@local.app` })
      .select()
      .single();

    if (createErr) throw createErr;
    Config.save({ userId: newUser.id });
    return newUser;
  },

  // ---- SETTINGS ----
  async getSettings() {
    const userId = Config.userId;
    if (!userId) return null;
    const { data } = await _supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  },

  async saveSettings(settings) {
    const userId = Config.userId;
    if (!userId) return;
    const existing = await this.getSettings();
    if (existing) {
      await _supabase.from('settings').update({ ...settings, updated_at: new Date().toISOString() }).eq('user_id', userId);
    } else {
      await _supabase.from('settings').insert({ user_id: userId, ...settings });
    }
  },

  // ---- MESSAGES ----
  async getMessages(limit = 60) {
    const userId = Config.userId;
    const { data } = await _supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).reverse();
  },

  async addMessage(role, content, metadata = {}) {
    const userId = Config.userId;
    const { data, error } = await _supabase
      .from('messages')
      .insert({ user_id: userId, role, content, metadata })
      .select()
      .single();
    if (error) console.error('addMessage error:', error);
    return data;
  },

  async clearMessages() {
    const userId = Config.userId;
    await _supabase.from('messages').delete().eq('user_id', userId);
  },

  // ---- TASKS ----
  async getTasks(filters = {}) {
    const userId = Config.userId;
    let q = _supabase.from('tasks').select('*, projects(name)').eq('user_id', userId);
    
    if (Config.currentArea && Config.currentArea !== 'Все') {
      q = q.eq('area', Config.currentArea);
    }

    if (filters.status) q = q.eq('status', filters.status);
    if (filters.direction) q = q.eq('direction', filters.direction);
    if (filters.priority) q = q.eq('priority', filters.priority);
    if (filters.project_id) q = q.eq('project_id', filters.project_id);
    if (filters.search) q = q.ilike('title', `%${filters.search}%`);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) console.error('getTasks error:', error);
    return data || [];
  },

  async createTask(task) {
    const userId = Config.userId;
    const area = task.area || (Config.currentArea !== 'Все' ? Config.currentArea : 'Работа');
    const { data, error } = await _supabase
      .from('tasks')
      .insert({ user_id: userId, area, ...task })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTask(id, updates) {
    const { data, error } = await _supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTask(id) {
    await _supabase.from('tasks').delete().eq('id', id);
  },

  // ---- PROJECTS ----
  async getProjects() {
    const userId = Config.userId;
    const { data } = await _supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async createProject(project) {
    const userId = Config.userId;
    const { data, error } = await _supabase
      .from('projects')
      .insert({ user_id: userId, ...project })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProject(id, updates) {
    const { data, error } = await _supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProject(id) {
    await _supabase.from('projects').delete().eq('id', id);
  },

  // ---- EVENTS ----
  async getEvents(startDate, endDate) {
    const userId = Config.userId;
    let q = _supabase.from('events').select('*').eq('user_id', userId);
    
    if (Config.currentArea && Config.currentArea !== 'Все') {
      q = q.eq('area', Config.currentArea);
    }

    if (startDate) q = q.gte('start_at', startDate);
    if (endDate) q = q.lte('start_at', endDate);
    q = q.order('start_at', { ascending: true });
    const { data } = await q;
    return data || [];
  },

  async createEvent(event) {
    const userId = Config.userId;
    const area = event.area || (Config.currentArea !== 'Все' ? Config.currentArea : 'Работа');
    const { data, error } = await _supabase
      .from('events')
      .insert({ user_id: userId, area, ...event })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateEvent(id, updates) {
    const { data, error } = await _supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteEvent(id) {
    await _supabase.from('events').delete().eq('id', id);
  },

  // ---- KNOWLEDGE BASE ----
  async getKnowledge(filters = {}) {
    const userId = Config.userId;
    let q = _supabase.from('knowledge_base').select('*').eq('user_id', userId);

    if (Config.currentArea && Config.currentArea !== 'Все') {
      q = q.eq('area', Config.currentArea);
    }

    if (filters.type) q = q.eq('type', filters.type);
    if (filters.search) q = q.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    if (filters.tag) q = q.contains('tags', [filters.tag]);
    q = q.order('created_at', { ascending: false });
    const { data } = await q;
    return data || [];
  },

  async createKnowledge(item) {
    const userId = Config.userId;
    const area = item.area || (Config.currentArea !== 'Все' ? Config.currentArea : 'Работа');
    const { data, error } = await _supabase
      .from('knowledge_base')
      .insert({ user_id: userId, area, ...item })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateKnowledge(id, updates) {
    const { data, error } = await _supabase
      .from('knowledge_base')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteKnowledge(id) {
    await _supabase.from('knowledge_base').delete().eq('id', id);
  },

  async uploadKnowledgeImage(file) {
    const userId = Config.userId;
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    const { data, error } = await _supabase.storage
      .from('kb-images')
      .upload(fileName, file, { upsert: false });
      
    if (error) throw error;
    
    const { data: { publicUrl } } = _supabase.storage
      .from('kb-images')
      .getPublicUrl(fileName);
      
    return publicUrl;
  },

  // ---- STATE SNAPSHOT ----
  async getLatestSnapshot() {
    const userId = Config.userId;
    const { data } = await _supabase
      .from('state_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data;
  },

  async saveSnapshot(snapshot) {
    const userId = Config.userId;
    await _supabase.from('state_snapshots').insert({ user_id: userId, snapshot });
  },

  // ---- REMINDERS ----
  async getActiveReminders() {
    const userId = Config.userId;
    const now = new Date().toISOString();
    const { data, error } = await _supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('sent', false)
      .lte('remind_at', now);
    if (error) throw error;
    return data || [];
  },

  async markReminderSent(id) {
    await _supabase.from('reminders').update({ sent: true }).eq('id', id);
  },

  async createReminder(reminder) {
    const userId = Config.userId;
    const { data, error } = await _supabase
      .from('reminders')
      .insert({ user_id: userId, ...reminder })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ---- HABITS ----
  async getHabits() {
    const userId = Config.userId;
    const { data } = await _supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    return data || [];
  },

  async createHabit(name, frequency = 'daily') {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('habits').insert({ user_id: userId, name, frequency }).select().single();
    if (error) throw error;
    return data;
  },

  async deleteHabit(id) {
    await _supabase.from('habits').delete().eq('id', id);
  },

  async getHabitLogs(startDate, endDate) {
    const userId = Config.userId;
    const { data } = await _supabase
      .from('habit_logs')
      .select('*, habits!inner(*)')
      .eq('habits.user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    return data || [];
  },

  async logHabit(habitId, date, status = 'done') {
    const { data, error } = await _supabase
      .from('habit_logs')
      .upsert({ habit_id: habitId, date, status }, { onConflict: 'habit_id,date' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteHabitLog(habitId, date) {
    await _supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date);
  },

  // ---- GOALS ----
  async getGoals() {
    const userId = Config.userId;
    const { data } = await _supabase.from('goals').select('*, projects(name)').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
  },

  async createGoal(goal) {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('goals').insert({ user_id: userId, ...goal }).select().single();
    if (error) throw error;
    return data;
  },

  async updateGoal(id, updates) {
    const { data, error } = await _supabase.from('goals').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteGoal(id) {
    await _supabase.from('goals').delete().eq('id', id);
  },

  // ---- INBOX ----
  async getInbox(onlyUnprocessed = false) {
    const userId = Config.userId;
    let q = _supabase.from('inbox').select('*').eq('user_id', userId);
    if (onlyUnprocessed) q = q.eq('processed', false);
    q = q.order('created_at', { ascending: false });
    const { data } = await q;
    const items = data || [];
    
    return items.map(item => {
      const match = item.content.match(/^\[\[AREA:(.*?)\]\](.*)$/s);
      if (match) {
        return { ...item, area: match[1], content: match[2] };
      }
      return { ...item, area: 'Работа' }; // Default for legacy items
    }).filter(item => Config.currentArea === 'Все' || item.area === Config.currentArea);
  },

  async addToInbox(content) {
    const userId = Config.userId;
    const area = Config.currentArea !== 'Все' ? Config.currentArea : 'Работа';
    const textWithArea = `[[AREA:${area}]]${content}`;
    const { data, error } = await _supabase.from('inbox').insert({ user_id: userId, content: textWithArea }).select().single();
    if (error) throw error;
    return data;
  },

  async updateInboxItem(id, updates) {
    const { data, error } = await _supabase.from('inbox').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteInboxItem(id) {
    await _supabase.from('inbox').delete().eq('id', id);
  },

  // ---- UPLOADED FILES ----
  async getUploadedFiles() {
    const userId = Config.userId;
    const { data } = await _supabase.from('uploaded_files').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
  },

  async addUploadedFile(filename, contentType, textContent) {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('uploaded_files').insert({ user_id: userId, filename, content_type: contentType, text_content: textContent }).select().single();
    if (error) throw error;
    return data;
  },

  async deleteUploadedFile(id) {
    await _supabase.from('uploaded_files').delete().eq('id', id);
  },

  // ---- POMODORO SESSIONS ----
  async savePomodoroSession(session) {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('pomodoro_sessions').insert({ user_id: userId, ...session }).select().single();
    if (error) throw error;
    return data;
  },

  // ---- NOTES ----
  async getNotes() {
    const userId = Config.userId;
    let q = _supabase.from('notes').select('*').eq('user_id', userId);
    if (Config.currentArea && Config.currentArea !== 'Все') {
      q = q.eq('area', Config.currentArea);
    }
    const { data } = await q.order('created_at', { ascending: false });
    return data || [];
  },

  async createNote(note) {
    const userId = Config.userId;
    const area = note.area || (Config.currentArea !== 'Все' ? Config.currentArea : 'Работа');
    const { data, error } = await _supabase.from('notes').insert({ user_id: userId, area, ...note }).select().single();
    if (error) throw error;
    return data;
  },

  async updateNote(id, updates) {
    const { data, error } = await _supabase.from('notes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteNote(id) {
    await _supabase.from('notes').delete().eq('id', id);
  },

  // ---- FINANCES ----
  async getTransactions() {
    const userId = Config.userId;
    const { data } = await _supabase.from('finances').select('*').eq('user_id', userId).order('date', { ascending: false });
    return data || [];
  },

  async createTransaction(tx) {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('finances').insert({ user_id: userId, ...tx }).select().single();
    if (error) throw error;
    return data;
  },

  async updateTransaction(id, updates) {
    const { data, error } = await _supabase.from('finances').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteTransaction(id) {
    await _supabase.from('finances').delete().eq('id', id);
  },

  // ---- HABITS ----
  async getHabits() {
    const userId = Config.userId;
    const { data } = await _supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    return data || [];
  },

  async createHabit(name, frequency = 'daily') {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('habits').insert({ user_id: userId, name, frequency }).select().single();
    if (error) throw error;
    return data;
  },

  async updateHabit(id, updates) {
    const { data, error } = await _supabase.from('habits').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteHabit(id) {
    await _supabase.from('habits').delete().eq('id', id);
  },

  // ---- HABIT LOGS ----
  async getHabitLogs(startDateStr, endDateStr) {
    let q = _supabase.from('habit_logs').select('*');
    if (startDateStr) q = q.gte('date', startDateStr);
    if (endDateStr) q = q.lte('date', endDateStr);
    const { data } = await q;
    return data || [];
  },

  async logHabit(habitId, dateStr, status = 'done') {
    const { data, error } = await _supabase.from('habit_logs')
      .upsert({ habit_id: habitId, date: dateStr, status }, { onConflict: 'habit_id, date' })
      .select().single();
    if (error) throw error;
    return data;
  },

  async deleteHabitLog(habitId, dateStr) {
    await _supabase.from('habit_logs').delete().match({ habit_id: habitId, date: dateStr });
  },

  // ---- HELPERS ----
  getMinskDateString(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const ms = date.toLocaleString('en-US', { timeZone: 'Europe/Minsk' });
    const minskDate = new Date(ms);
    const y = minskDate.getFullYear();
    const m = String(minskDate.getMonth() + 1).padStart(2, '0');
    const d = String(minskDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  async getTasksForContext() {
    const tasks = await this.getTasks({});
    const active = tasks.filter(t => !['Готово', 'Отменена'].includes(t.status));
    const todayStr = this.getMinskDateString(0);
    const futureStr = this.getMinskDateString(7);
    
    const overdue = active.filter(t => t.deadline && t.deadline < todayStr);
    const today = active.filter(t => t.deadline === todayStr);
    const upcoming = active.filter(t => t.deadline && t.deadline > todayStr && t.deadline <= futureStr);
    const inProgress = active.filter(t => t.status === 'В работе');
    
    return { active, overdue, today, upcoming, in_progress: inProgress, all: tasks };
  },

  async getTodayEvents() {
    const minskDateStr = this.getMinskDateString(0);
    const start = new Date(minskDateStr + 'T00:00:00.000+03:00').toISOString();
    const end = new Date(minskDateStr + 'T23:59:59.999+03:00').toISOString();
    return this.getEvents(start, end);
  },

  // ---- TUTORING (STUDENTS) ----
  async getStudents() {
    const userId = Config.userId;
    const { data } = await _supabase.from('students').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
  },

  async createStudent(student) {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('students').insert({ user_id: userId, ...student }).select().single();
    if (error) throw error;
    return data;
  },

  async updateStudent(id, updates) {
    const { data, error } = await _supabase.from('students').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteStudent(id) {
    await _supabase.from('students').delete().eq('id', id);
  },

  // ---- TUTORING (LESSONS) ----
  async getLessons(studentId = null) {
    let q = _supabase.from('lessons').select('*, students(name)').order('date', { ascending: false });
    if (studentId) q = q.eq('student_id', studentId);
    const { data } = await q;
    return data || [];
  },

  async createLesson(lesson) {
    const { data, error } = await _supabase.from('lessons').insert(lesson).select().single();
    if (error) throw error;
    return data;
  },

  async updateLesson(id, updates) {
    const { data, error } = await _supabase.from('lessons').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteLesson(id) {
    await _supabase.from('lessons').delete().eq('id', id);
  },

  // ---- GAMIFICATION (RPG) ----
  async getGamificationStats() {
    const userId = Config.userId;
    if (!userId) return { tasksDone: 0, habitsDone: 0, totalXp: 0 };

    // 1. Считаем выполненные задачи
    const { count: tasksDone } = await _supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'Готово');

    // 2. Считаем выполненные привычки
    const { count: habitsDone } = await _supabase
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'done');

    const xp = (tasksDone || 0) * 10 + (habitsDone || 0) * 15;
    return { tasksDone: tasksDone || 0, habitsDone: habitsDone || 0, totalXp: xp };
  }
};
