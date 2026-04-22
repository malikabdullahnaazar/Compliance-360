import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Brain, Plus, Search, Edit2, Save, Trash2, X, RefreshCw, AlertTriangle } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { addToast } from '../store/slices/uiSlice';
import { promptService } from '../services/prompt.service';

const PromptManagementPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected prompt state
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const dispatch = useDispatch();

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await promptService.getPrompts();
      // Handle standard DRF pagination or list format
      setPrompts(response.data.results || response.data || []);
    } catch (error) {
      dispatch(addToast({ type: 'error', message: 'Failed to fetch prompts' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSelectPrompt = (prompt) => {
    setSelectedPrompt({ ...prompt });
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    setSelectedPrompt({
      identifier: '',
      name: '',
      description: '',
      prompt_text: '',
      is_active: true
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedPrompt.identifier || !selectedPrompt.name || !selectedPrompt.prompt_text) {
      dispatch(addToast({ type: 'error', message: 'Identifier, Name, and Prompt Text are required.' }));
      return;
    }

    setIsSaving(true);
    try {
      if (selectedPrompt.id) {
        await promptService.updatePrompt(selectedPrompt.id, selectedPrompt);
        dispatch(addToast({ type: 'success', message: 'Prompt updated successfully' }));
      } else {
        await promptService.createPrompt(selectedPrompt);
        dispatch(addToast({ type: 'success', message: 'Prompt created successfully' }));
      }
      setIsEditing(false);
      fetchPrompts();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.identifier?.[0] || 'Failed to save prompt';
      dispatch(addToast({ type: 'error', message: msg }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this prompt? This could break AI features relying on it.")) {
      return;
    }
    try {
      await promptService.deletePrompt(id);
      dispatch(addToast({ type: 'success', message: 'Prompt deleted' }));
      setSelectedPrompt(null);
      fetchPrompts();
    } catch (error) {
      dispatch(addToast({ type: 'error', message: 'Failed to delete prompt' }));
    }
  };

  const filteredPrompts = prompts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.identifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-gray-900 transition-colors">
      <Sidebar
        onToggle={setSidebarCollapsed}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
        <Navbar
          variant="app"
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Brain className="h-6 w-6 text-teal-600" />
                AI Prompt Management
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Configure and fine-tune system prompts used by the AI engine.
              </p>
            </div>
            <Button onClick={handleCreateNew} className="flex items-center gap-2 whitespace-nowrap">
              <Plus className="h-4 w-4" /> Create Prompt
            </Button>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Prompt List */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-4">
              <Card className="h-[calc(100vh-220px)] flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search prompts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm focus:ring-teal-500 focus:border-teal-500 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="h-6 w-6 animate-spin text-teal-500" />
                    </div>
                  ) : filteredPrompts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No prompts found.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {filteredPrompts.map((prompt) => (
                        <li key={prompt.id}>
                          <button
                            onClick={() => handleSelectPrompt(prompt)}
                            className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex flex-col gap-1
                              ${selectedPrompt?.id === prompt.id 
                                ? 'bg-teal-50 border border-teal-200 dark:bg-teal-900/20 dark:border-teal-800/50' 
                                : 'hover:bg-gray-50 border border-transparent dark:hover:bg-gray-800/50'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-medium text-sm truncate ${selectedPrompt?.id === prompt.id ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-white'}`}>
                                {prompt.name}
                              </span>
                              {!prompt.is_active && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium">Inactive</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 truncate" title={prompt.identifier}>
                              {prompt.identifier}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN: Editor/Details */}
            <div className="lg:col-span-8 xl:col-span-9">
              {selectedPrompt ? (
                <Card className="min-h-[calc(100vh-220px)] flex flex-col">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 py-4 px-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {isEditing ? (selectedPrompt.id ? 'Edit Prompt' : 'New Prompt') : selectedPrompt.name}
                      </h2>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                              <Edit2 className="h-4 w-4 mr-1.5" /> Edit
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(selectedPrompt.id)}>
                              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => {
                              if (selectedPrompt.id) {
                                // Reset to existing
                                const original = prompts.find(p => p.id === selectedPrompt.id);
                                setSelectedPrompt({ ...original });
                                setIsEditing(false);
                              } else {
                                setSelectedPrompt(null);
                              }
                            }}>
                              <X className="h-4 w-4 mr-1.5" /> Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                              {isSaving ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />} 
                              Save Changes
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 flex-1">
                    {isEditing ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={selectedPrompt.name}
                              onChange={(e) => setSelectedPrompt({...selectedPrompt, name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                              placeholder="e.g., Chart Extraction Rules"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Identifier (Unique Code) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={selectedPrompt.identifier}
                              onChange={(e) => setSelectedPrompt({...selectedPrompt, identifier: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
                              placeholder="e.g., chart_extractor"
                            />
                            <p className="text-xs text-gray-500 mt-1">Used in code to reference this prompt.</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={selectedPrompt.description}
                            onChange={(e) => setSelectedPrompt({...selectedPrompt, description: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Brief description of what this prompt does..."
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={selectedPrompt.is_active}
                            onChange={(e) => setSelectedPrompt({...selectedPrompt, is_active: e.target.checked})}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                          />
                          <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                            Active (Enable this prompt)
                          </label>
                        </div>

                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                          <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <span>System Prompt Text <span className="text-red-500">*</span></span>
                            <span className="text-xs font-normal text-gray-500 flex items-center"><AlertTriangle className="h-3 w-3 mr-1 text-yellow-500"/> Changes here directly affect AI outputs</span>
                          </label>
                          <textarea
                            value={selectedPrompt.prompt_text}
                            onChange={(e) => setSelectedPrompt({...selectedPrompt, prompt_text: e.target.value})}
                            rows={15}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm leading-relaxed whitespace-pre-wrap"
                            placeholder="You are an AI assistant..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-lg">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Identifier</p>
                            <p className="font-mono text-sm text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 inline-block px-2 py-0.5 rounded">
                              {selectedPrompt.identifier}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${selectedPrompt.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {selectedPrompt.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</p>
                            <p className="text-sm text-gray-900 dark:text-gray-300">{selectedPrompt.description || 'No description provided.'}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Prompt Configuration</p>
                          <div className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap border border-gray-800">
                            {selectedPrompt.prompt_text}
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between text-xs text-gray-500">
                          <span>Created: {new Date(selectedPrompt.created_at).toLocaleString()}</span>
                          <span>Last updated by: {selectedPrompt.updated_by_name || 'System'}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-[calc(100vh-220px)] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/20">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-4">
                    <Brain className="h-8 w-8 text-teal-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Prompt Selected</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm text-center">
                    Select a prompt from the list to view or edit its configuration, or create a new one.
                  </p>
                  <Button className="mt-6" onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" /> Create Prompt
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptManagementPage;
