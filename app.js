// State management
let state = {
  syncMode: 'live', // Default to live sync if keys are set
  supabaseUrl: 'https://etdorhclbxibheuoclqp.supabase.co', // User's Supabase URL
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZG9yaGNsYnhpYmhldW9jbHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjA1NTIsImV4cCI6MjA5ODgzNjU1Mn0.osisfPNmKUzUSUx1lfBlJGMoAIEGS7XQ0z-yI1-v03M', // User's Supabase Anon Key
  supabaseClient: null,
  spaces: [],
  registrations: [],
  activeTab: 'tab-list',
  selectedSpace: null,
  searchQuery: '',
  myRegistrationIds: JSON.parse(localStorage.getItem('our_space_my_regs') || '[]')
};

// Mock Initial Data (for demo mode)
const MOCK_SPACES = [
  {
    id: 'mock-space-1',
    host_name: '김민수 집사',
    space_name: '민수의 아늑한 서재',
    location: '서울 마포구 공덕동 10-5 (공덕역 4번 출구 앞)',
    capacity: 8,
    fee: '없음',
    parking_info: 'yes',
    description: '따뜻한 핸드드립 커피와 보이차가 준비되어 있습니다. 책으로 가득 찬 아늑한 서재 공간에서 편안하게 함께 예배드리고 교제 나누길 소망합니다. 주차는 오피스텔 지하 주차장에 1대 무료 지원 가능합니다. 아이 동반 가능합니다.',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'mock-space-2',
    host_name: '박영희 권사',
    space_name: '푸른 나무 스터디룸 (공간 대여)',
    location: '서울 서대문구 신촌로 123 (2층)',
    capacity: 12,
    fee: '5,000원 (공간 대여료 분담)',
    parking_info: 'none',
    description: '지하철역과 가까운 대형 세미나실 카페를 2시간 동안 예약했습니다. 쾌적한 환경과 음향 시설이 갖추어져 있어 편하게 찬양하고 나눌 수 있습니다. 오실 때 따뜻한 마음만 가지고 편하게 오세요!',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'mock-space-3',
    host_name: '최성호 장로',
    space_name: '성호네 패밀리 룸',
    location: '서울 용산구 한강대로 45 (신용산파크 102동)',
    capacity: 15,
    fee: '없음 (점심 제공)',
    parking_info: 'yes',
    description: '거실이 넓어 많은 인원이 모여도 쾌적합니다. 예배 후 함께 김밥과 라면으로 가벼운 점심 식사 교제를 나눌 예정입니다. 식사 준비를 위해 미리 신청해 주시면 감사하겠습니다.',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

const MOCK_REGISTRATIONS = [
  { id: 'mock-reg-1', space_id: 'mock-space-1', user_name: '이영희', user_phone: '1234', party_size: 2, parking_required: true },
  { id: 'mock-reg-2', space_id: 'mock-space-1', user_name: '정지훈', user_phone: '5678', party_size: 1, parking_required: false },
  { id: 'mock-reg-3', space_id: 'mock-space-2', user_name: '최재은', user_phone: '9012', party_size: 3, parking_required: false },
  { id: 'mock-reg-4', space_id: 'mock-space-2', user_name: '김태우', user_phone: '3456', party_size: 1, parking_required: false },
  { id: 'mock-reg-5', space_id: 'mock-space-2', user_name: '박민지', user_phone: '7890', party_size: 2, parking_required: true },
  { id: 'mock-reg-6', space_id: 'mock-space-3', user_name: '윤석진', user_phone: '2468', party_size: 4, parking_required: true }
];

// Load Settings from LocalStorage or Hardcoded Config
function loadSettings() {
  const savedMode = localStorage.getItem('our_space_sync_mode');
  const savedUrl = localStorage.getItem('our_space_sb_url');
  const savedKey = localStorage.getItem('our_space_sb_key');

  // Priority 1: User's custom settings saved in LocalStorage
  if (savedUrl && savedKey) {
    state.supabaseUrl = savedUrl;
    state.supabaseKey = savedKey;
    state.syncMode = savedMode || 'live';
  }

  // Priority 2: Check if developer has replaced the hardcoded placeholders
  const isHardcodedConfigured = 
    state.supabaseUrl && 
    state.supabaseUrl !== 'YOUR_SUPABASE_URL' && 
    state.supabaseKey && 
    state.supabaseKey !== 'YOUR_SUPABASE_KEY';

  if (isHardcodedConfigured && state.syncMode !== 'demo') {
    state.syncMode = 'live';
    
    // Set up UI
    document.getElementById('modeLive').classList.add('active');
    document.getElementById('modeDemo').classList.remove('active');
    document.getElementById('supabaseConfigArea').classList.remove('hidden');
    document.getElementById('sbUrl').value = state.supabaseUrl;
    document.getElementById('sbKey').value = state.supabaseKey;
    
    initSupabase();
  } else if (state.syncMode === 'live' && savedUrl && savedKey) {
    // Fallback if settings have saved URL/Key
    document.getElementById('modeLive').classList.add('active');
    document.getElementById('modeDemo').classList.remove('active');
    document.getElementById('supabaseConfigArea').classList.remove('hidden');
    document.getElementById('sbUrl').value = state.supabaseUrl;
    document.getElementById('sbKey').value = state.supabaseKey;
    
    initSupabase();
  } else {
    // If not configured, fall back to Demo Mode with LocalStorage
    state.syncMode = 'demo';
    document.getElementById('modeDemo').classList.add('active');
    document.getElementById('modeLive').classList.remove('active');
    document.getElementById('supabaseConfigArea').classList.add('hidden');
    
    // Initialize LocalStorage with Mock Data if empty
    if (!localStorage.getItem('our_space_spaces')) {
      localStorage.setItem('our_space_spaces', JSON.stringify(MOCK_SPACES));
    }
    if (!localStorage.getItem('our_space_regs')) {
      localStorage.setItem('our_space_regs', JSON.stringify(MOCK_REGISTRATIONS));
    }
    updateConnectionStatusUI(false);
  }
}

// Initialize Supabase Client
function initSupabase() {
  if (typeof supabase !== 'undefined' && state.supabaseUrl && state.supabaseKey) {
    try {
      let cleanUrl = state.supabaseUrl.trim();
      if (cleanUrl.endsWith('/rest/v1/')) {
        cleanUrl = cleanUrl.slice(0, -9);
      } else if (cleanUrl.endsWith('/rest/v1')) {
        cleanUrl = cleanUrl.slice(0, -8);
      }
      state.supabaseClient = supabase.createClient(cleanUrl, state.supabaseKey);
      updateConnectionStatusUI(true);
    } catch (err) {
      showToast('Supabase 연결 설정에 실패했습니다. 설정을 확인해 주세요.', 'error');
      updateConnectionStatusUI(false, 'error');
    }
  } else {
    updateConnectionStatusUI(false);
  }
}

// Update connection badge UI
function updateConnectionStatusUI(isLive, statusType = 'ok') {
  const el = document.getElementById('connectionStatus');
  const dot = el.querySelector('.status-dot');
  const txt = el.querySelector('.status-text');

  el.className = 'status-indicator';

  if (isLive) {
    if (statusType === 'ok') {
      el.classList.add('live-mode');
      txt.textContent = '실시간 동기화 중 (Supabase)';
    } else {
      el.classList.add('demo-mode');
      txt.textContent = '데이터베이스 연결 실패';
    }
  } else {
    el.classList.add('demo-mode');
    txt.textContent = '데모 모드 (기기 내 저장)';
  }
}

// Local Database Adapter
const localDb = {
  getSpaces: () => {
    return JSON.parse(localStorage.getItem('our_space_spaces') || '[]');
  },
  saveSpaces: (spaces) => {
    localStorage.setItem('our_space_spaces', JSON.stringify(spaces));
  },
  getRegistrations: () => {
    return JSON.parse(localStorage.getItem('our_space_regs') || '[]');
  },
  saveRegistrations: (regs) => {
    localStorage.setItem('our_space_regs', JSON.stringify(regs));
  },
  createSpace: (space) => {
    const spaces = localDb.getSpaces();
    const newSpace = {
      id: 'space-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      ...space
    };
    spaces.unshift(newSpace);
    localDb.saveSpaces(spaces);
    return newSpace;
  },
  createRegistration: (reg) => {
    const regs = localDb.getRegistrations();
    const newReg = {
      id: 'reg-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      ...reg
    };
    regs.push(newReg);
    localDb.saveRegistrations(regs);
    return newReg;
  },
  deleteRegistration: (id) => {
    let regs = localDb.getRegistrations();
    const initialLength = regs.length;
    regs = regs.filter(r => r.id !== id);
    localDb.saveRegistrations(regs);
    return regs.length < initialLength;
  }
};

// Supabase Database Adapter
const supabaseDb = {
  getSpaces: async () => {
    if (!state.supabaseClient) throw new Error('Supabase client not initialized');
    const { data, error } = await state.supabaseClient
      .from('spaces')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  createSpace: async (space) => {
    if (!state.supabaseClient) throw new Error('Supabase client not initialized');
    const { data, error } = await state.supabaseClient
      .from('spaces')
      .insert([space])
      .select();
    if (error) throw error;
    return data[0];
  },
  getRegistrations: async () => {
    if (!state.supabaseClient) throw new Error('Supabase client not initialized');
    const { data, error } = await state.supabaseClient
      .from('registrations')
      .select('*');
    if (error) throw error;
    return data;
  },
  createRegistration: async (reg) => {
    if (!state.supabaseClient) throw new Error('Supabase client not initialized');
    const { data, error } = await state.supabaseClient
      .from('registrations')
      .insert([reg])
      .select();
    if (error) throw error;
    return data[0];
  },
  deleteRegistration: async (id, phoneCode) => {
    if (!state.supabaseClient) throw new Error('Supabase client not initialized');
    // Security: Only delete if user name/phone code matches in real database
    const { error } = await state.supabaseClient
      .from('registrations')
      .delete()
      .eq('id', id)
      .eq('user_phone', phoneCode);
    if (error) throw error;
    return true;
  }
};

// Fetch data depending on active mode
async function loadData() {
  showGridLoading(true);
  try {
    if (state.syncMode === 'live' && state.supabaseClient) {
      state.spaces = await supabaseDb.getSpaces();
      state.registrations = await supabaseDb.getRegistrations();
    } else {
      state.spaces = localDb.getSpaces();
      state.registrations = localDb.getRegistrations();
    }
    renderSummary();
    renderSpaces();
    if (state.selectedSpace) {
      // Refresh modal data if modal is open
      const freshSpace = state.spaces.find(s => s.id === state.selectedSpace.id);
      if (freshSpace) {
        openSpaceDetailsModal(freshSpace);
      } else {
        closeModal();
      }
    }
  } catch (err) {
    console.error('Error fetching data:', err);
    showToast('데이터를 불러오는 중 오류가 발생했습니다. 데모 모드로 자동 전환합니다.', 'error');
    // Fallback to demo mode silently to ensure app is usable
    state.spaces = localDb.getSpaces();
    state.registrations = localDb.getRegistrations();
    renderSummary();
    renderSpaces();
  } finally {
    showGridLoading(false);
  }
}

// Show/hide grid loading spinner
function showGridLoading(isLoading) {
  const grid = document.getElementById('spaceGrid');
  if (isLoading) {
    grid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>데이터 동기화 중...</p>
      </div>
    `;
  }
}

// Render Summary Cards
function renderSummary() {
  const totalSpaces = state.spaces.length;
  const totalCapacity = state.spaces.reduce((sum, s) => sum + parseInt(s.capacity || 0), 0);
  const totalRegistered = state.registrations.reduce((sum, r) => sum + parseInt(r.party_size || 1), 0);

  document.getElementById('statTotalSpaces').textContent = `${totalSpaces}개`;
  document.getElementById('statTotalCapacity').textContent = `${totalCapacity}명`;
  document.getElementById('statTotalRegistered').textContent = `${totalRegistered}명`;
}

// Filter and Render Space Cards
function renderSpaces() {
  const grid = document.getElementById('spaceGrid');
  grid.innerHTML = '';

  const query = state.searchQuery.toLowerCase().trim();
  const onlyParking = document.getElementById('filterParking') ? document.getElementById('filterParking').checked : false;

  const filteredSpaces = state.spaces.filter(s => {
    const matchesQuery = (
      s.host_name.toLowerCase().includes(query) ||
      s.space_name.toLowerCase().includes(query) ||
      s.location.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query))
    );
    const matchesParking = !onlyParking || s.parking_info === 'yes';
    return matchesQuery && matchesParking;
  });

  if (filteredSpaces.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i data-lucide="compass"></i>
        <h3>등록된 모임 공간이 없습니다</h3>
        <p>조건을 변경하여 검색하거나 새로운 공간을 등록해 보세요.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  filteredSpaces.forEach(space => {
    const spaceRegs = state.registrations.filter(r => r.space_id === space.id);
    const currentCount = spaceRegs.reduce((sum, r) => sum + parseInt(r.party_size || 1), 0);
    const maxCapacity = parseInt(space.capacity);
    const occupancyRate = (currentCount / maxCapacity) * 100;
    const isFull = currentCount >= maxCapacity;

    // Create card element
    const card = document.createElement('div');
    card.className = 'space-card';
    card.dataset.id = space.id;

    let progressBarClass = '';
    if (occupancyRate >= 100) progressBarClass = 'full';
    else if (occupancyRate >= 75) progressBarClass = 'near-full';

    const feeBadgeText = space.fee.toLowerCase().includes('없음') ? '회비 없음' : space.fee;
    const feeBadgeClass = space.fee.toLowerCase().includes('없음') ? 'status-open' : 'status-full';

    let parkingText = space.parking_info === 'yes' ? '주차 가능' : '주차 불가능';

    card.innerHTML = `
      <div class="space-card-header">
        <h3>${escapeHtml(space.space_name)}</h3>
        <span class="badge ${isFull ? 'status-full' : 'status-open'}">
          ${isFull ? '마감' : '모집중'}
        </span>
      </div>
      <div class="host">
        <i data-lucide="user" style="width: 14px; height: 14px;"></i>
        <span>호스트: <strong>${escapeHtml(space.host_name)}</strong></span>
      </div>
      <div class="space-card-body">
        <div class="space-info-row">
          <i data-lucide="map-pin"></i>
          <span class="info-label">위치</span>
          <span class="info-text truncate">${escapeHtml(space.location)}</span>
        </div>
        <div class="space-info-row">
          <i data-lucide="banknote"></i>
          <span class="info-label">회비</span>
          <span class="info-text"><span class="badge ${feeBadgeClass}">${escapeHtml(feeBadgeText)}</span></span>
        </div>
        <div class="space-info-row">
          <i data-lucide="car"></i>
          <span class="info-label">주차</span>
          <span class="info-text">${escapeHtml(parkingText)}</span>
        </div>
        ${space.description ? `
        <div class="space-info-row" style="margin-top: 0.5rem;">
          <i data-lucide="align-left"></i>
          <span class="info-text description-text truncate" style="color: var(--text-muted); font-size: 0.8rem;">
            ${escapeHtml(space.description)}
          </span>
        </div>` : ''}
      </div>
      <div class="space-card-footer">
        <div class="capacity-status">
          <span>참석 인원</span>
          <span class="status-number">${currentCount} / ${maxCapacity} 명</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${progressBarClass}" style="width: ${Math.min(occupancyRate, 100)}%"></div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openSpaceDetailsModal(space);
    });

    grid.appendChild(card);
  });

  lucide.createIcons();
}

// Open Space Details Modal
function openSpaceDetailsModal(space) {
  state.selectedSpace = space;
  const modal = document.getElementById('detailsModal');
  const spaceRegs = state.registrations.filter(r => r.space_id === space.id);
  const currentCount = spaceRegs.reduce((sum, r) => sum + parseInt(r.party_size || 1), 0);
  const maxCapacity = parseInt(space.capacity);
  const isFull = currentCount >= maxCapacity;

  // Build Maps search link (Naver or Kakao map search)
  const mapSearchUrl = `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(space.location)}`;
  const mapLink = document.getElementById('modalMapLink');
  mapLink.href = mapSearchUrl;

  // Update text
  document.getElementById('modalSpaceName').textContent = space.space_name;
  document.getElementById('modalHostName').textContent = space.host_name;
  document.getElementById('modalLocation').textContent = space.location;
  document.getElementById('modalDescription').textContent = space.description || '호스트가 등록한 상세 소개가 없습니다.';
  document.getElementById('modalCurrentCount').textContent = currentCount;
  document.getElementById('modalMaxCapacity').textContent = maxCapacity;

  // Set fee badge
  const feeBadge = document.getElementById('modalFeeBadge');
  const feeText = space.fee.toLowerCase().includes('없음') ? '회비 없음' : space.fee;
  feeBadge.textContent = feeText;
  feeBadge.className = space.fee.toLowerCase().includes('없음') ? 'badge status-open' : 'badge status-full';

  // Set parking info
  document.getElementById('modalParking').textContent = space.parking_info === 'yes' ? '주차 가능' : '주차 불가능';

  // Set status badge
  const statusBadge = document.getElementById('modalStatusBadge');
  if (isFull) {
    statusBadge.textContent = '인원 마감';
    statusBadge.className = 'badge status-full';
  } else {
    statusBadge.textContent = '모집중';
    statusBadge.className = 'badge status-open';
  }

  // Progress Bar
  const occupancyRate = (currentCount / maxCapacity) * 100;
  const progressBar = document.getElementById('modalProgressBar');
  progressBar.style.width = `${Math.min(occupancyRate, 100)}%`;
  progressBar.className = 'progress-bar-fill';
  if (occupancyRate >= 100) progressBar.classList.add('full');
  else if (occupancyRate >= 75) progressBar.classList.add('near-full');

  // Render Participants list
  const listContainer = document.getElementById('modalParticipantsList');
  listContainer.innerHTML = '';
  
  if (spaceRegs.length === 0) {
    listContainer.innerHTML = '<li class="no-participants">첫 번째 신청자가 되어보세요!</li>';
  } else {
    spaceRegs.forEach(reg => {
      const li = document.createElement('li');
      li.className = 'participant-chip';
      const partyText = reg.party_size && parseInt(reg.party_size) > 1 ? ` (${reg.party_size}명)` : '';
      const parkingIcon = reg.parking_required ? ` <i data-lucide="car" style="width: 12px; height: 12px; color: var(--accent); margin-left: 0.25rem; vertical-align: middle;" title="주차 필요"></i>` : '';
      li.innerHTML = `
        <i data-lucide="user"></i>
        <span>${escapeHtml(reg.user_name)}${partyText}</span>
        ${parkingIcon}
      `;
      listContainer.appendChild(li);
    });
    lucide.createIcons();
  }

  // Setup form states
  document.getElementById('joinSpaceId').value = space.id;
  document.getElementById('joinParking').checked = false;
  
  // Check if I am already registered in this space
  const myRegInSpace = spaceRegs.find(r => state.myRegistrationIds.includes(r.id));
  
  const joinFormSection = document.getElementById('joinFormSection');
  const alreadyJoinedSection = document.getElementById('alreadyJoinedSection');

  if (myRegInSpace) {
    // Already registered! Show cancel option
    joinFormSection.classList.add('hidden');
    alreadyJoinedSection.classList.remove('hidden');
    
    // Bind cancellation event
    const btnCancel = document.getElementById('btnCancelJoin');
    btnCancel.onclick = async () => {
      if (confirm('이 모임 공간 신청을 취소하시겠습니까?')) {
        await cancelRegistration(myRegInSpace.id, myRegInSpace.user_phone);
      }
    };
  } else {
    // Not registered yet
    if (isFull) {
      joinFormSection.classList.add('hidden');
      alreadyJoinedSection.classList.add('hidden');
      
      const closedMsg = document.createElement('div');
      closedMsg.id = 'tempClosedMsg';
      closedMsg.className = 'alert alert-success';
      closedMsg.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
      closedMsg.style.borderColor = 'rgba(239, 68, 68, 0.15)';
      closedMsg.style.color = '#b91c1c';
      closedMsg.innerHTML = '<i data-lucide="alert-circle"></i> 정원이 마감되어 신청할 수 없습니다.';
      
      const prevMsg = joinFormSection.parentNode.querySelector('#tempClosedMsg');
      if (prevMsg) prevMsg.remove();
      
      joinFormSection.parentNode.insertBefore(closedMsg, joinFormSection);
      lucide.createIcons();
    } else {
      const prevMsg = joinFormSection.parentNode.querySelector('#tempClosedMsg');
      if (prevMsg) prevMsg.remove();
      
      joinFormSection.classList.remove('hidden');
      alreadyJoinedSection.classList.add('hidden');
      document.getElementById('joinName').value = '';
      document.getElementById('joinPhone').value = '';
    }
  }

  modal.classList.add('active');
}

// Close Modal
function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
  const tempMsg = document.querySelector('#tempClosedMsg');
  if (tempMsg) tempMsg.remove();
  state.selectedSpace = null;
}

// Open Space Submit
async function handleHostFormSubmit(e) {
  e.preventDefault();
  
  const host_name = document.getElementById('hostName').value.trim();
  const space_name = document.getElementById('spaceName').value.trim();
  const capacity = parseInt(document.getElementById('maxCapacity').value);
  const fee = document.getElementById('spaceFee').value.trim();
  const parking_info = document.getElementById('spaceParking').value;
  const location = document.getElementById('spaceLocation').value.trim();
  const description = document.getElementById('spaceDescription').value.trim();

  const btn = document.getElementById('btnSubmitSpace');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; margin: 0; border-width: 2px;"></div> &nbsp; 등록 중...`;

  try {
    const spaceData = { host_name, space_name, capacity, fee, parking_info, location, description };
    let newSpace;

    if (state.syncMode === 'live') {
      newSpace = await supabaseDb.createSpace(spaceData);
    } else {
      newSpace = localDb.createSpace(spaceData);
    }

    showToast(`"${space_name}" 공간이 성공적으로 개설되었습니다!`, 'success');
    document.getElementById('hostForm').reset();
    
    // Switch to space list tab
    switchTab('tab-list');
    await loadData();
  } catch (err) {
    console.error(err);
    showToast('공간 개설 중 오류가 발생했습니다. 입력 정보를 확인하세요.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check"></i> <span>공간 개설하기</span>`;
    lucide.createIcons();
  }
}

// Join Space Submit
async function handleJoinFormSubmit(e) {
  e.preventDefault();
  
  const space_id = document.getElementById('joinSpaceId').value;
  const user_name = document.getElementById('joinName').value.trim();
  const user_phone = document.getElementById('joinPhone').value.trim(); // 4 digits check
  const party_size = parseInt(document.getElementById('joinCount').value || 1);

  if (user_phone.length !== 4 || isNaN(user_phone)) {
    showToast('연락처 뒷자리 4자리를 정확히 입력해주세요.', 'error');
    return;
  }

  if (isNaN(party_size) || party_size < 1) {
    showToast('인원수를 1명 이상 입력해주세요.', 'error');
    return;
  }

  // Check if this user is already registered in any space
  const existingReg = state.registrations.find(r => r.user_name === user_name && r.user_phone === user_phone);
  if (existingReg) {
    const existingSpace = state.spaces.find(s => s.id === existingReg.space_id);
    const spaceName = existingSpace ? existingSpace.space_name : '다른';
    showToast(`이미 '${spaceName}' 공간에 신청되어 있습니다. 한 번에 하나의 공간만 신청할 수 있습니다.`, 'error');
    return;
  }

  const btn = document.getElementById('btnSubmitJoin');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; margin: 0; border-width: 2px;"></div> &nbsp; 신청 중...`;

  try {
    // Verify capacity first
    const space = state.spaces.find(s => s.id === space_id);
    const spaceRegs = state.registrations.filter(r => r.space_id === space_id);
    const currentCount = spaceRegs.reduce((sum, r) => sum + parseInt(r.party_size || 1), 0);
    const maxCapacity = parseInt(space.capacity);

    if (currentCount + party_size > maxCapacity) {
      showToast(`신청 인원수가 남은 정원을 초과합니다. (남은 정원: ${maxCapacity - currentCount}명)`, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="user-plus"></i> <span>예배 공간 참석 신청</span>`;
      lucide.createIcons();
      return;
    }

    const parking_required = document.getElementById('joinParking').checked;

    const regData = { space_id, user_name, user_phone, party_size, parking_required };
    let newReg;

    if (state.syncMode === 'live') {
      newReg = await supabaseDb.createRegistration(regData);
    } else {
      newReg = localDb.createRegistration(regData);
    }

    // Save my registration ID to track cancel option
    state.myRegistrationIds.push(newReg.id);
    localStorage.setItem('our_space_my_regs', JSON.stringify(state.myRegistrationIds));

    showToast(`"${space.space_name}" 공간에 예배 참석 신청이 완료되었습니다!`, 'success');
    await loadData();
  } catch (err) {
    console.error(err);
    showToast('참석 신청 중 오류가 발생했습니다.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="user-plus"></i> <span>예배 공간 참석 신청</span>`;
    lucide.createIcons();
  }
}

// Cancel registration
async function cancelRegistration(regId, phoneCode) {
  try {
    let success = false;
    if (state.syncMode === 'live') {
      success = await supabaseDb.deleteRegistration(regId, phoneCode);
    } else {
      success = localDb.deleteRegistration(regId);
    }

    if (success) {
      // Remove from my list
      state.myRegistrationIds = state.myRegistrationIds.filter(id => id !== regId);
      localStorage.setItem('our_space_my_regs', JSON.stringify(state.myRegistrationIds));

      showToast('참석 신청이 취소되었습니다.', 'info');
      await loadData();
    } else {
      showToast('참석 신청 취소에 실패했습니다. 비밀번호(전화번호 뒷자리)가 일치하지 않거나 이미 처리되었습니다.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('취소 처리 중 오류가 발생했습니다.', 'error');
  }
}

// Switch Tabs
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update Tab Contents
  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === tabId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  if (tabId === 'tab-list') {
    loadData();
  }
}

// HTML Escaper to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Custom Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  else if (type === 'error') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();

  // Slide out and remove after 3.5s
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3500);
}

// Test Connection for Supabase
async function testSupabaseConnection(url, key) {
  const resultText = document.getElementById('connectionResultText');
  resultText.className = 'connection-result';
  resultText.textContent = '연결 시도 중...';

  if (!url || !key) {
    resultText.className = 'connection-result error';
    resultText.textContent = 'URL과 Key를 모두 입력해주세요.';
    return false;
  }

  try {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/rest/v1/')) {
      cleanUrl = cleanUrl.slice(0, -9);
    } else if (cleanUrl.endsWith('/rest/v1')) {
      cleanUrl = cleanUrl.slice(0, -8);
    }
    const client = supabase.createClient(cleanUrl, key);
    // Simple test query
    const { error } = await client.from('spaces').select('id').limit(1);
    
    if (error) {
      // Check if table missing error or credential error
      if (error.code === 'PGRST116' || error.message.includes('relation "spaces" does not exist')) {
        resultText.className = 'connection-result success';
        resultText.textContent = '연결 성공! 단, 테이블이 아직 존재하지 않습니다. 아래 SQL을 실행해 주세요.';
        return client;
      }
      throw error;
    }

    resultText.className = 'connection-result success';
    resultText.textContent = '성공적으로 연결되었습니다! 설정이 저장되었습니다.';
    return client;
  } catch (err) {
    console.error(err);
    resultText.className = 'connection-result error';
    resultText.textContent = `연결 실패: ${err.message || '인증 정보 혹은 네트워크 상태를 확인하세요.'}`;
    return false;
  }
}

// Backup Functions (Export / Import JSON)
function exportDemoData() {
  const spaces = localDb.getSpaces();
  const regs = localDb.getRegistrations();
  const backup = { spaces, registrations: regs, exportedAt: new Date().toISOString() };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `our_space_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('데이터 백업 파일 다운로드가 시작되었습니다.', 'success');
}

function importDemoData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.spaces && data.registrations) {
        localDb.saveSpaces(data.spaces);
        localDb.saveRegistrations(data.registrations);
        showToast('성공적으로 데이터를 복구했습니다!', 'success');
        loadData();
      } else {
        showToast('올바른 백업 파일 형식이 아닙니다.', 'error');
      }
    } catch (err) {
      showToast('파일을 읽는 도중 오류가 발생했습니다.', 'error');
    }
  };
  reader.readAsText(file);
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Load settings & data
  loadSettings();
  loadData();

  // Tab Events
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Search filter event
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderSpaces();
  });

  // Parking filter event
  document.getElementById('filterParking').addEventListener('change', () => {
    renderSpaces();
  });

  // Reload action
  document.getElementById('btnReloadData').addEventListener('click', async () => {
    const icon = document.querySelector('#btnReloadData svg');
    if (icon) icon.style.animation = 'spin 1s linear infinite';
    
    await loadData();
    
    if (icon) icon.style.animation = '';
    showToast('최신 정보로 갱신되었습니다.', 'success');
  });

  // Modal Events
  document.getElementById('btnModalClose').addEventListener('click', closeModal);
  document.getElementById('detailsModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailsModal') closeModal();
  });

  // Host Space Form Submit
  document.getElementById('hostForm').addEventListener('submit', handleHostFormSubmit);

  // Join Space Form Submit
  document.getElementById('joinForm').addEventListener('submit', handleJoinFormSubmit);

  // Settings Drawer Toggle
  const settingsDrawer = document.getElementById('settingsDrawer');
  document.getElementById('btnSettings').addEventListener('click', () => {
    settingsDrawer.classList.add('active');
  });
  document.getElementById('btnSettingsClose').addEventListener('click', () => {
    settingsDrawer.classList.remove('active');
  });
  settingsDrawer.addEventListener('click', (e) => {
    if (e.target.id === 'settingsDrawer') settingsDrawer.classList.remove('active');
  });

  // Settings sync mode switch toggle buttons
  const btnDemo = document.getElementById('modeDemo');
  const btnLive = document.getElementById('modeLive');
  const configArea = document.getElementById('supabaseConfigArea');

  btnDemo.addEventListener('click', () => {
    btnDemo.classList.add('active');
    btnLive.classList.remove('active');
    configArea.classList.add('hidden');
    state.syncMode = 'demo';
    localStorage.setItem('our_space_sync_mode', 'demo');
    updateConnectionStatusUI(false);
    loadData();
    showToast('데모 모드로 전환되었습니다 (내 기기에만 저장).', 'info');
  });

  btnLive.addEventListener('click', () => {
    btnLive.classList.add('active');
    btnDemo.classList.remove('active');
    configArea.classList.remove('hidden');
    state.syncMode = 'live';
    localStorage.setItem('our_space_sync_mode', 'live');
    
    const savedUrl = localStorage.getItem('our_space_sb_url') || '';
    const savedKey = localStorage.getItem('our_space_sb_key') || '';
    
    if (savedUrl && savedKey) {
      initSupabase();
      loadData();
    } else {
      updateConnectionStatusUI(true, 'error');
      showToast('Supabase API 설정을 입력해 주세요.', 'info');
    }
  });

  // Test and save Supabase credentials
  document.getElementById('btnTestConnection').addEventListener('click', async () => {
    const url = document.getElementById('sbUrl').value.trim();
    const key = document.getElementById('sbKey').value.trim();

    const client = await testSupabaseConnection(url, key);
    if (client) {
      localStorage.setItem('our_space_sb_url', url);
      localStorage.setItem('our_space_sb_key', key);
      state.supabaseUrl = url;
      state.supabaseKey = key;
      state.supabaseClient = client;
      state.syncMode = 'live';
      updateConnectionStatusUI(true, 'ok');
      await loadData();
    } else {
      updateConnectionStatusUI(true, 'error');
    }
  });

  // Copy SQL script helper
  document.getElementById('btnCopySql').addEventListener('click', () => {
    const code = document.getElementById('sqlCode').innerText;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('btnCopySql');
      btn.textContent = '복사 완료!';
      setTimeout(() => {
        btn.textContent = 'SQL 복사';
      }, 2000);
      showToast('SQL 스크립트가 클립보드에 복사되었습니다.', 'success');
    }).catch(err => {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    });
  });

  // Backup file buttons logic
  document.getElementById('btnExportData').addEventListener('click', exportDemoData);
  
  const fileInput = document.getElementById('importFileInput');
  document.getElementById('btnImportData').addEventListener('click', () => {
    fileInput.click();
  });
  fileInput.addEventListener('change', importDemoData);
});
