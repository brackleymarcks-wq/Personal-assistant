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
    const { data, error } = await _supabase
      .from('tasks')
      .insert({ user_id: userId, ...task })
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
    if (startDate) q = q.gte('start_at', startDate);
    if (endDate) q = q.lte('start_at', endDate);
    q = q.order('start_at', { ascending: true });
    const { data } = await q;
    return data || [];
  },

  async createEvent(event) {
    const userId = Config.userId;
    const { data, error } = await _supabase
      .from('events')
      .insert({ user_id: userId, ...event })
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
    if (filters.type) q = q.eq('type', filters.type);
    if (filters.search) q = q.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    if (filters.tag) q = q.contains('tags', [filters.tag]);
    q = q.order('created_at', { ascending: false });
    const { data } = await q;
    return data || [];
  },

  async createKnowledge(item) {
    const userId = Config.userId;
    const { data, error } = await _supabase
      .from('knowledge_base')
      .insert({ user_id: userId, ...item })
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
    const { data } = await _supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('sent', false)
      .lte('remind_at', now);
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
    return data || [];
  },

  async addToInbox(content) {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('inbox').insert({ user_id: userId, content }).select().single();
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
    const { data } = await _supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
  },

  async createNote(note) {
    const userId = Config.userId;
    const { data, error } = await _supabase.from('notes').insert({ user_id: userId, ...note }).select().single();
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

  // ---- HELPERS ----
  async getTasksForContext() {
    const tasks = await this.getTasks({});
    const active = tasks.filter(t => !['Готово', 'Отменена'].includes(t.status));
    const overdue = active.filter(t => t.deadline && new Date(t.deadline) < new Date());
    const today = active.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });
    return { active, overdue, today, all: tasks };
  },

  async getTodayEvents() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    return this.getEvents(start, end);
  }
};
