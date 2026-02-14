(function () {
  'use strict';

  const MIN_IMAGES = 5;
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // 认证状态管理
  const AUTH_KEY = 'moments_auth';

  function getAuthState() {
    try {
      const data = localStorage.getItem(AUTH_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function setAuthState(token, user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
  }

  function clearAuthState() {
    localStorage.removeItem(AUTH_KEY);
  }

  function getAuthHeaders() {
    const auth = getAuthState();
    if (auth && auth.token) {
      return { Authorization: `Bearer ${auth.token}` };
    }
    return {};
  }

  const uploadZone = $('#uploadZone');
  const fileInput = $('#fileInput');
  const uploadPlaceholder = $('#uploadPlaceholder');
  const previewGrid = $('#previewGrid');
  const btnAnalyze = $('#btnAnalyze');
  const loadingSection = $('#loadingSection');
  const resultSection = $('#resultSection');
  const resultContent = $('#resultContent');
  const btnCopy = $('#btnCopy');
  const btnShare = $('#btnShare');
  const toast = $('#toast');

  let images = [];
  let currentResult = '';

  // Toast
  function showToast(msg, duration = 2500) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.animation = 'none';
    setTimeout(() => {
      toast.style.animation = 'fadeIn 0.3s ease-out';
    }, 10);
    setTimeout(() => toast.classList.add('hidden'), duration);
  }

  // 校验单张图片
  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return '仅支持 JPG、PNG、WebP 格式';
    }
    if (file.size > MAX_SIZE) {
      return '单张图片不能超过 5MB';
    }
    return null;
  }

  // 读取为 base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 添加图片
  async function addFiles(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    for (const file of list) {
      const err = validateFile(file);
      if (err) {
        showToast(err);
        continue;
      }
      try {
        const dataUrl = await fileToBase64(file);
        images.push({ file, dataUrl });
      } catch (e) {
        showToast('图片读取失败');
      }
    }
    renderPreview();
    updateButton();
  }

  // 删除图片
  function removeImage(index) {
    images.splice(index, 1);
    renderPreview();
    updateButton();
  }

  // 渲染预览
  function renderPreview() {
    previewGrid.innerHTML = '';
    if (images.length === 0) {
      uploadPlaceholder.classList.remove('hidden');
      return;
    }
    uploadPlaceholder.classList.add('hidden');
    images.forEach((img, i) => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      const imgEl = document.createElement('img');
      imgEl.src = img.dataUrl;
      imgEl.alt = `截图 ${i + 1}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'remove';
      btn.textContent = '×';
      btn.setAttribute('aria-label', '删除');
      btn.onclick = (e) => {
        e.stopPropagation();
        removeImage(i);
      };
      div.appendChild(imgEl);
      div.appendChild(btn);
      previewGrid.appendChild(div);
    });
  }

  // 更新按钮状态
  function updateButton() {
    btnAnalyze.disabled = images.length < MIN_IMAGES;
  }

  // 维度配置
  const DIMENSIONS = {
    '生活习惯': { icon: '🏠', color: '#4ECDC4' },
    '消费习惯': { icon: '💰', color: '#FFD93D' },
    '兴趣爱好': { icon: '🎯', color: '#6A0572' },
    '性格特质': { icon: '🧠', color: '#FF6B6B' },
    '社交圈': { icon: '👥', color: '#45B7D1' },
    '情感状态': { icon: '💖', color: '#FF8E53' },
    '价值观': { icon: '🌟', color: '#96CEB4' },
    '沟通风格': { icon: '💬', color: '#DDA0DD' }
  };

  // 结构化渲染结果
  function renderResult(content) {
    currentResult = content;
    
    // 显示结果区域
    resultSection.classList.remove('hidden');
    
    // 简单的结构化处理
    resultContent.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p style="font-size: 18px; margin-bottom: 24px;">分析完成！点击下方按钮查看详细结果</p>
        <button class="share-btn primary" onclick="showResultModal()" style="margin: 0 auto;">
          📊 查看详细分析
        </button>
      </div>
    `;
    
    // 填充模态框内容
    fillModalContent(content);
  }

  // 填充模态框内容
  function fillModalContent(content) {
    const modalBody = document.getElementById('modalBody');
    
    // 简单的维度分析（实际项目中可能需要更复杂的 NLP 处理）
    const analysisData = analyzeContent(content);
    
    let html = '<div class="analysis-grid">';
    
    for (const [dimension, data] of Object.entries(analysisData)) {
      const config = DIMENSIONS[dimension] || { icon: '📋', color: '#666666' };
      
      html += `
        <div class="analysis-dimension">
          <h3>
            <span class="dimension-icon" style="color: ${config.color};">${config.icon}</span>
            ${dimension}
          </h3>
          <div class="dimension-content">
            ${data.analysis}
          </div>
          ${data.tips ? `
            <div class="dimension-tips">
              <h4>💡 建议</h4>
              <p>${data.tips}</p>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    html += '</div>';
    
    // 添加会员功能
    html += `
      <div class="premium-feature">
        <h4>💎 会员专享功能</h4>
        <p>升级会员即可导出完整分析报告（PDF 格式），包含更详细的分析维度和个性化建议。</p>
        <button class="premium-btn" onclick="showPremiumFeature()">
          📄 导出完整报告
        </button>
      </div>
    `;
    
    modalBody.innerHTML = html;
  }

  // 简单的内容分析（模拟）
  function analyzeContent(content) {
    // 这里应该是更复杂的 NLP 处理，现在使用模拟数据
    return {
      '生活习惯': {
        analysis: '<p>根据朋友圈内容分析，该用户生活规律，注重健康饮食，有定期运动的习惯。</p><p>喜欢整洁的生活环境，注重个人卫生和生活品质。</p>',
        tips: '可以从健康生活方式入手，邀请一起运动或分享健康食谱。'
      },
      '消费习惯': {
        analysis: '<p>消费观念理性，注重性价比，偶尔会有小奢侈。</p><p>喜欢投资自我提升，如学习课程、旅行体验等。</p>',
        tips: '送礼时注重实用性和心意，避免过于昂贵的礼物。'
      },
      '兴趣爱好': {
        analysis: '<p>热爱旅行、摄影，喜欢探索新事物。</p><p>对音乐、电影有较高的鉴赏能力，偶尔参加文化活动。</p>',
        tips: '可以分享旅行经历，讨论电影音乐，寻找共同兴趣话题。'
      },
      '性格特质': {
        analysis: '<p>性格开朗外向，善于与人交往，有较强的沟通能力。</p><p>情绪稳定，乐观积极，面对困难能够从容应对。</p>',
        tips: '保持积极乐观的态度，多进行正向互动。'
      },
      '社交圈': {
        analysis: '<p>社交圈广泛，朋友众多，善于维护人际关系。</p><p>重视朋友间的真诚和信任，对朋友慷慨大方。</p>',
        tips: '可以通过共同朋友搭建桥梁，参与集体活动。'
      },
      '情感状态': {
        analysis: '<p>目前情感状态稳定，对感情认真负责。</p><p>注重伴侣间的精神契合和相互理解。</p>',
        tips: '建立深度沟通，展现你的真诚和责任心。'
      },
      '价值观': {
        analysis: '<p>价值观积极向上，注重个人成长和社会责任。</p><p>重视家庭观念，对未来有明确的规划。</p>',
        tips: '分享你的人生规划和价值观，寻找共鸣点。'
      },
      '沟通风格': {
        analysis: '<p>沟通风格直接坦诚，喜欢清晰明确的表达。</p><p>注重倾听，能够理解他人的观点。</p>',
        tips: '保持真诚的沟通，避免含糊其辞，多倾听对方的想法。'
      }
    };
  }

  // 显示结果模态框
  function showResultModal() {
    const modal = document.getElementById('resultModal');
    modal.classList.add('show');
    modal.classList.remove('hidden');
  }

  // 关闭模态框
  function closeResultModal() {
    const modal = document.getElementById('resultModal');
    modal.classList.remove('show');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }

  // 复制结果
  function copyResult() {
    if (!currentResult) {
      showToast('暂无分析结果');
      return;
    }
    
    navigator.clipboard.writeText(currentResult).then(() => {
      showToast('结果已复制到剪贴板');
    }).catch(() => {
      showToast('复制失败，请手动复制');
    });
  }

  // 分享结果
  async function shareResult() {
    if (!currentResult) {
      showToast('暂无分析结果');
      return;
    }

    try {
      const authState = getAuthState();
      const headers = { 'Content-Type': 'application/json' };
      
      if (authState && authState.token) {
        headers['Authorization'] = `Bearer ${authState.token}`;
      }

      const res = await fetch('/api/share/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: currentResult,
          isPublic: true,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || '保存分享失败');
      }

      const shareUrl = data.shareUrl;
      
      if (navigator.share) {
        navigator.share({
          title: '朋友圈人物分析结果',
          text: '我用 AI 分析了朋友圈，获得了详细的人物洞察！',
          url: shareUrl
        }).catch(() => {
          copyShareUrl(shareUrl);
        });
      } else {
        copyShareUrl(shareUrl);
      }
    } catch (err) {
      console.error('分享失败:', err);
      showToast(err.message || '分享失败，请稍后重试');
    }
  }

  function copyShareUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('分享链接已复制！');
    }).catch(() => {
      showToast('复制失败，请手动复制链接');
    });
  }

  // 导出文档功能
  function exportDocument() {
    showToast('会员专享功能：导出完整分析报告');
    // 实际项目中这里应该跳转到会员升级页面或直接生成 PDF
  }

  // 显示会员功能
  function showPremiumFeature() {
    showToast('会员专享功能：导出完整分析报告');
  }

  // 全局函数
  window.showResultModal = showResultModal;
  window.closeResultModal = closeResultModal;
  window.showPremiumFeature = showPremiumFeature;

  // 点击上传
  uploadZone.addEventListener('click', (e) => {
    if (e.target.closest('.preview-item')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files || []);
    e.target.value = '';
  });

  // 拖拽上传
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    addFiles(e.dataTransfer.files || []);
  });

  // 开始分析
  btnAnalyze.addEventListener('click', async () => {
    if (images.length < MIN_IMAGES) {
      showToast(`请至少上传 ${MIN_IMAGES} 张截图`);
      return;
    }

    // 动画效果
    loadingSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    btnAnalyze.classList.add('loading');
    btnAnalyze.disabled = true;

    try {
      const authState = getAuthState();
      const requestBody = {
        images: images.map((img) => img.dataUrl),
      };
      
      if (authState && authState.user) {
        requestBody.userId = authState.user.id;
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || `请求失败 ${res.status}`);
      }

      const content = data.content || data.text || data.result || '';
      renderResult(content);
      
      // 动画显示结果
      setTimeout(() => {
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err) {
      showToast(err.message || '分析失败，请稍后重试');
    } finally {
      setTimeout(() => {
        loadingSection.classList.add('hidden');
        btnAnalyze.classList.remove('loading');
        btnAnalyze.disabled = images.length < MIN_IMAGES;
      }, 300);
    }
  });

  // 复制和分享功能
  if (btnCopy) {
    btnCopy.addEventListener('click', copyResult);
  }
  
  if (btnShare) {
    btnShare.addEventListener('click', shareResult);
  }
  
  // 导出文档功能
  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', exportDocument);
  }
  
  // 模态框关闭功能
  const btnModalClose = document.getElementById('btnModalClose');
  if (btnModalClose) {
    btnModalClose.addEventListener('click', closeResultModal);
  }
  
  // 点击模态框背景关闭
  const resultModal = document.getElementById('resultModal');
  if (resultModal) {
    resultModal.addEventListener('click', (e) => {
      if (e.target === resultModal) {
        closeResultModal();
      }
    });
  }

  // 初始化
  renderPreview();
  updateButton();
})();
