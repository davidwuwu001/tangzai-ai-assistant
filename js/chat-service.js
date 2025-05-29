/**
 * chat-service.js
 * 聊天服务模块 - 负责聊天历史管理和消息交互
 */

// 聊天服务对象
const ChatService = {
    // 存储对话历史 - 以智能体ID为键
    messageHistories: {},
    
    // 初始化
    init: function() {
        this.loadMessageHistories();
        
        // 设置定期保存
        setInterval(() => this.saveMessageHistories(), 60000); // 每分钟保存一次
        
        return this.messageHistories;
    },
    
    // 加载聊天记录
    loadMessageHistories: function() {
        try {
            let saved = null;
            
            // 使用StorageService加载
            if (window.StorageService) {
                saved = window.StorageService.getItem('messageHistories');
            } else {
                // 兼容模式
                saved = localStorage.getItem('messageHistories');
            }
            
            if (saved) {
                try {
                    this.messageHistories = JSON.parse(saved);
                    console.log("成功加载聊天记录");
                    
                    // 设置全局引用以便兼容性
                    window.messageHistories = this.messageHistories;
                } catch (parseError) {
                    console.error("聊天记录解析失败:", parseError);
                    this.messageHistories = {};
                    window.messageHistories = {};
                }
            } else {
                console.log("未找到聊天记录，使用空对象");
                this.messageHistories = {};
                window.messageHistories = {};
            }
        } catch (error) {
            console.error("加载聊天记录出错:", error);
            this.messageHistories = {};
            window.messageHistories = {};
        }
    },
    
    // 保存聊天记录
    saveMessageHistories: function() {
        try {
            const historyString = JSON.stringify(this.messageHistories);
            
            // 使用StorageService保存
            if (window.StorageService) {
                const result = window.StorageService.setItem('messageHistories', historyString);
                
                if (!result) {
                    console.warn("聊天记录保存可能失败，尝试清理后重新保存");
                    this.pruneMessageHistories();
                    window.StorageService.setItem('messageHistories', JSON.stringify(this.messageHistories));
                }
            } else {
                // 兼容模式
                try {
                    localStorage.setItem('messageHistories', historyString);
                } catch (e) {
                    console.warn("聊天记录保存失败，尝试清理后重新保存");
                    this.pruneMessageHistories();
                    localStorage.setItem('messageHistories', JSON.stringify(this.messageHistories));
                }
            }
        } catch (error) {
            console.error("保存聊天记录出错:", error);
            
            // 如果存储空间不足，清理一些旧消息
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                this.pruneMessageHistories();
                try {
                    if (window.StorageService) {
                        window.StorageService.setItem('messageHistories', JSON.stringify(this.messageHistories));
                    } else {
                        localStorage.setItem('messageHistories', JSON.stringify(this.messageHistories));
                    }
                } catch (e) {
                    console.error("即使清理后仍无法保存聊天记录:", e);
                }
            }
        }
    },
    
    // 清理过长的聊天记录以节省空间
    pruneMessageHistories: function() {
        const MAX_MESSAGES_PER_AGENT = 50;
        
        for (const agentId in this.messageHistories) {
            if (this.messageHistories[agentId].length > MAX_MESSAGES_PER_AGENT) {
                // 保留最近的消息
                this.messageHistories[agentId] = this.messageHistories[agentId].slice(-MAX_MESSAGES_PER_AGENT);
            }
        }
        
        // 更新全局引用
        window.messageHistories = this.messageHistories;
    },
    
    // 添加用户消息
    addUserMessage: function(agentId, message) {
        if (!agentId) {
            console.error("没有指定智能体ID");
            return false;
        }
        
        // 初始化历史记录（如果不存在）
        if (!this.messageHistories[agentId]) {
            this.messageHistories[agentId] = [];
        }
        
        // 添加消息
        this.messageHistories[agentId].push({ role: 'user', content: message });
        
        // 更新全局引用
        window.messageHistories = this.messageHistories;
        
        // 保存到本地存储
        this.saveMessageHistories();
        
        return true;
    },
    
    // 添加AI回复
    addAIMessage: function(agentId, message) {
        if (!agentId) {
            console.error("没有指定智能体ID");
            return false;
        }
        
        // 初始化历史记录（如果不存在）
        if (!this.messageHistories[agentId]) {
            this.messageHistories[agentId] = [];
        }
        
        // 添加消息
        this.messageHistories[agentId].push({ role: 'assistant', content: message });
        
        // 更新全局引用
        window.messageHistories = this.messageHistories;
        
        // 保存到本地存储
        this.saveMessageHistories();
        
        return true;
    },
    
    // 获取智能体的聊天历史
    getAgentHistory: function(agentId) {
        return this.messageHistories[agentId] || [];
    },
    
    // 清除聊天记录
    clearChatHistory: function() {
        const currentAgent = window.cache?.currentAgent;
        if (currentAgent) {
            this.clearAgentHistory(currentAgent.id);
            
            // 清除界面上的消息
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.innerHTML = '';
            }
            
            // 显示清除提示
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('聊天记录已清除');
            }
        }
    },
    
    // 清除智能体的聊天历史
    clearAgentHistory: function(agentId) {
        if (this.messageHistories[agentId]) {
            this.messageHistories[agentId] = [];
            
            // 更新全局引用
            window.messageHistories = this.messageHistories;
            
            // 保存到本地存储
            this.saveMessageHistories();
            return true;
        }
        return false;
    },
    
    // 发送消息到API并处理响应
    sendMessage: async function(message, currentAgent) {
        if (!message || !currentAgent) {
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage(!currentAgent ? '请先选择一个智能体' : '请输入消息');
            }
            return false;
        }
        
        // 添加到消息历史
        this.addUserMessage(currentAgent.id, message);
        
        // 获取对话历史
        const history = this.getAgentHistory(currentAgent.id);
        
        try {
            // 调用API服务发送消息
            if (window.ApiService) {
                const response = await window.ApiService.sendMessage(message, currentAgent, history);
                
                if (response) {
                    // 添加AI回复到历史记录
                    this.addAIMessage(currentAgent.id, response);
                    
                    // 显示AI回复
                    if (window.MessageHandler) {
                        window.MessageHandler.displayMessage(currentAgent.name, response, 'ai-message');
                    }
                    
                    return response;
                }
            } else {
                throw new Error('API服务未初始化');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('发送失败: ' + error.message);
            }
            
            return false;
        }
    }
};

// 导出聊天服务
if (typeof window !== 'undefined') {
    window.ChatService = ChatService;
}