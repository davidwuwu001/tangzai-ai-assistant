/**
 * app.js
 * 应用入口模块 - 负责初始化和协调各个服务模块
 */

// 应用对象
const App = {
    // 是否已初始化
    initialized: false,
    
    // DOM元素
    elements: {
        chatContainer: null,
        userInput: null,
        sendButton: null,
        clearButton: null,
        agentSelector: null,
        adminModeCheckbox: null,
        adminPanel: null,
        settingsButton: null,
        settingsPanel: null,
        settingsOverlay: null
    },
    
    // 初始化函数
    init: async function() {
        // 防止重复初始化
        if (this.initialized) {
            console.log("应用已初始化，跳过");
            return;
        }
        
        // 标记已初始化
        this.initialized = true;
        window.hasInitialized = true;
        console.log("初始化应用...");
        
        // 初始化缓存
        this.initCache();
        
        // 获取DOM元素
        this.getElements();
        
        // 初始化服务
        this.initServices();
        
        // 注册事件监听器
        this.registerEventListeners();
        
        console.log("应用初始化完成");
    },
    
    // 初始化全局缓存对象
    initCache: function() {
        // 清理可能存在的旧缓存数据，防止API密钥错误
        this.clearOldCache();
        
        // 全局缓存，用于存储共享数据
        window.cache = {
            agents: null,
            currentAgent: null,
            settings: null
        };
    },
    
    // 清理旧的缓存数据
    clearOldCache: function() {
        try {
            // 检查版本号，如果是旧版本则清除所有localStorage数据
            const currentVersion = "2025.01.24.1"; // 更新版本号
            const storedVersion = localStorage.getItem('app_version');
            
            if (storedVersion !== currentVersion) {
                console.log("检测到版本更新，清理旧缓存数据...");
                
                // 清除所有可能的旧数据
                const keysToRemove = [
                    'agents',
                    'currentAgent', 
                    'apiConfig',
                    'chatHistory',
                    'userSettings',
                    'agentData',
                    'apiKeys',
                    'selectedAgent'
                ];
                
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                });
                
                // 更新版本号
                localStorage.setItem('app_version', currentVersion);
                console.log("缓存清理完成，版本已更新到:", currentVersion);
            }
        } catch (error) {
            console.warn("清理缓存时出错:", error);
        }
    },
    
    // 获取DOM元素
    getElements: function() {
        this.elements.chatContainer = document.getElementById('chat-container');
        this.elements.userInput = document.getElementById('user-input');
        this.elements.sendButton = document.getElementById('send-button');
        this.elements.clearButton = document.getElementById('clear-button');
        this.elements.agentSelector = document.getElementById('agent-selector');
        this.elements.adminModeCheckbox = document.getElementById('admin-mode');
        this.elements.adminPanel = document.getElementById('admin-panel');
        this.elements.settingsButton = document.getElementById('settings-button');
        this.elements.settingsPanel = document.getElementById('settings-panel');
        this.elements.settingsOverlay = document.getElementById('settings-overlay');
    },
    
    // 发送消息
    sendMessage: async function() {
        const userInput = this.elements.userInput?.value?.trim();
        if (!userInput) return;
        
        try {
            // 获取当前选中的智能体
            const currentAgent = window.cache?.currentAgent;
            if (!currentAgent) {
                alert('请先选择一个智能体');
                return;
            }
            
            // 清空输入框
            this.elements.userInput.value = '';
            
            // 显示用户消息
            if (window.MessageHandler) {
                window.MessageHandler.displayMessage('用户', userInput, 'user-message');
            }
            
            // 调用聊天服务
            if (window.ChatService) {
                await window.ChatService.sendMessage(userInput, currentAgent);
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('发送消息失败: ' + error.message);
            }
        }
    },
    
    // 注册事件监听器
    registerEventListeners: function() {
        // 发送按钮点击事件
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        }

        // 输入框Enter键发送
        if (this.elements.userInput) {
            this.elements.userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // 清除聊天记录
        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', () => {
                if (window.ChatService) {
                    window.ChatService.clearChatHistory();
                }
            });
        }

        // 智能体选择器变化
        if (this.elements.agentSelector) {
            this.elements.agentSelector.addEventListener('change', (e) => {
                if (window.AgentService) {
                    window.AgentService.selectAgent(e.target.value);
                }
            });
        }

        // 管理员模式切换
        if (this.elements.adminModeCheckbox) {
            this.elements.adminModeCheckbox.addEventListener('change', (e) => {
                if (window.AgentService) {
                    window.AgentService.toggleAdminMode(e.target.checked);
                }
            });
        }
    }
};

// 导出应用对象
if (typeof window !== 'undefined') {
    window.App = App;
}

// 等待DOM加载完成后自动初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }
}