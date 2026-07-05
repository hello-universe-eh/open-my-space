// State management
let state = {
  supabaseUrl: 'https://etdorhclbxibheuoclqp.supabase.co', // Your Supabase URL
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZG9yaGNsYnhpYmhldW9jbHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjA1NTIsImV4cCI6MjA5ODgzNjU1Mn0.osisfPNmKUzUSUx1lfBlJGMoAIEGS7XQ0z-yI1-v03M', // Your Supabase Anon Key
  supabaseClient: null,
  spaces: [],
  registrations: [],
  activeTab: 'tab-list',
  selectedSpace: null,
  editingSpaceId: null, // ID of space currently being edited
  searchQuery: '',
  myRegistrationIds: JSON.parse(localStorage.getItem('our_space_my_regs') || '[]')
};

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
    } catch (err) {
      console.error('Supabase initialization failed:', err);
      showToast('데이터베이스 초기화에 실패했습니다. 관리자에게 문의하세요.', 'error');
    }
  }
}

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
  updateSpace: async (id, space) => {
    if (!state.supabaseClient) throw new Error('Supabase client not initialized');
    const { data, error } = await state.supabaseClient
      .from('spaces')
      .update(space)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },
  deleteSpace: async (id, hostPhone) => {
    if (!state.supabaseClient) throw new Error('Supabase client not initialized');
    const { error } = await state.supabaseClient
      .from('spaces')
      .delete()
      .eq('id', id)
      .eq('host_phone', hostPhone);
    if (error) throw error;
    return true;
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
    const { error } = await state.supabaseClient
      .from('registrations')
      .delete()
      .eq('id', id)
      .eq('user_phone', phoneCode);
    if (error) throw error;
    return true;
  }
};

// Fetch data from Supabase
async function loadData() {
  showGridLoading(true);
  try {
    if (state.supabaseClient) {
      state.spaces = await supabaseDb.getSpaces();
      state.registrations = await supabaseDb.getRegistrations();
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
    showToast('실시간 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    
    // Clear loading state and show a friendly error card
    const grid = document.getElementById('spaceGrid');
    grid.innerHTML = `
      <div class="empty-state" style="border-color: rgba(239, 68, 68, 0.15); background-color: rgba(239, 68, 68, 0.02);">
        <i data-lucide="alert-triangle" style="color: #dc2626;"></i>
        <h3 style="color: #dc2626;">데이터 연결 실패</h3>
        <p>실시간 서버와 연결을 설정하지 못했습니다.</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; max-width: 420px; line-height: 1.5;">
          데이터베이스에 <strong>spaces</strong> 및 <strong>registrations</strong> 테이블이 생성되었는지 확인해 주세요.<br>
          (가이드 문서의 SQL 스크립트를 Supabase SQL Editor에서 실행하셔야 합니다.)
        </p>
      </div>
    `;
    lucide.createIcons();
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
        <p>실시간 데이터 동기화 중...</p>
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

  // Build Maps search link
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

  // Bind Universal Registration Cancellation Event
  document.getElementById('btnVerifyCancel').onclick = async () => {
    const nameInput = prompt('신청 시 입력했던 이름을 입력해주세요:');
    if (!nameInput) return;
    
    const phoneInput = prompt('신청 시 입력했던 연락처 뒷자리 4자리를 입력해주세요:');
    if (!phoneInput) return;
    
    if (phoneInput.length !== 4 || isNaN(phoneInput)) {
      showToast('연락처 뒷자리 4자리를 정확히 입력해주세요.', 'error');
      return;
    }
    
    const matchedReg = spaceRegs.find(r => r.user_name === nameInput.trim() && r.user_phone === phoneInput.trim());
    if (matchedReg) {
      if (confirm(`${nameInput}님의 참석 신청(${matchedReg.party_size}명)을 취소하시겠습니까?`)) {
        await cancelRegistration(matchedReg.id, matchedReg.user_phone);
      }
    } else {
      showToast('입력하신 정보와 일치하는 신청 내역을 찾을 수 없습니다.', 'error');
    }
  };

  // --- Host Space Management Configuration ---
  const hostMgmtSec = document.getElementById('hostManagementSection');
  const btnVerifyHostTop = document.getElementById('btnVerifyHostTop');

  // Hidden by default when opening modal
  hostMgmtSec.classList.add('hidden');
  btnVerifyHostTop.classList.remove('hidden');

  // Bind Verify Host Button
  btnVerifyHostTop.onclick = () => {
    const codeInput = prompt('호스트 연락처 뒷자리 4자리를 입력해주세요:');
    if (codeInput === null) return;

    if (codeInput === space.host_phone) {
      showToast('호스트 인증에 성공했습니다! 관리 메뉴가 활성화됩니다.', 'success');
      
      // Toggle visibility
      btnVerifyHostTop.classList.add('hidden');
      hostMgmtSec.classList.remove('hidden');

      // Bind Edit Button
      document.getElementById('btnEditSpace').onclick = () => {
        closeModal();
        state.editingSpaceId = space.id;
        
        // Load details into Host Form
        document.getElementById('hostName').value = space.host_name;
        document.getElementById('hostPhone').value = space.host_phone;
        document.getElementById('spaceName').value = space.space_name;
        document.getElementById('maxCapacity').value = space.capacity;
        document.getElementById('spaceFee').value = space.fee;
        document.getElementById('spaceParking').value = space.parking_info;
        document.getElementById('spaceLocation').value = space.location;
        document.getElementById('spaceDescription').value = space.description || '';

        // Update Form Submit Button for edit mode
        const submitBtn = document.getElementById('btnSubmitSpace');
        submitBtn.innerHTML = `<i data-lucide="edit-3"></i> <span>공간 정보 수정 완료</span>`;
        lucide.createIcons();

        // Switch to Host Tab
        switchTab('tab-host');
        showToast('공간 수정 모드로 진입했습니다. 양식을 수정 후 완료해 주세요.', 'info');
      };

      // Bind Delete Button
      document.getElementById('btnDeleteSpace').onclick = async () => {
        if (confirm('이 모임 공간을 정말 삭제하시겠습니까?\n삭제 시 공간에 접수된 모든 예배 참석 신청 명단도 함께 취소됩니다.')) {
          await deleteHostSpace(space.id, space.host_phone);
        }
      };
    } else {
      showToast('호스트 연락처 번호가 일치하지 않습니다.', 'error');
    }
  };

  modal.classList.add('active');
}

// Close Modal
function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
  const tempMsg = document.querySelector('#tempClosedMsg');
  if (tempMsg) tempMsg.remove();
  state.selectedSpace = null;
}

// Host Space Submit
async function handleHostFormSubmit(e) {
  e.preventDefault();
  
  const host_name = document.getElementById('hostName').value.trim();
  const host_phone = document.getElementById('hostPhone').value.trim();
  const space_name = document.getElementById('spaceName').value.trim();
  const capacity = parseInt(document.getElementById('maxCapacity').value);
  const fee = document.getElementById('spaceFee').value.trim();
  const parking_info = document.getElementById('spaceParking').value;
  const location = document.getElementById('spaceLocation').value.trim();
  const description = document.getElementById('spaceDescription').value.trim();

  if (host_phone.length !== 4 || isNaN(host_phone)) {
    showToast('호스트 연락처 뒷자리 4자리를 정확히 입력해주세요.', 'error');
    return;
  }

  const btn = document.getElementById('btnSubmitSpace');
  btn.disabled = true;
  
  const isEditing = state.editingSpaceId !== null;
  btn.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; margin: 0; border-width: 2px;"></div> &nbsp; ${isEditing ? '수정' : '등록'} 중...`;

  try {
    const spaceData = { host_name, host_phone, space_name, capacity, fee, parking_info, location, description };
    
    if (isEditing) {
      // Update Space
      await supabaseDb.updateSpace(state.editingSpaceId, spaceData);
      showToast(`"${space_name}" 공간 정보가 수정되었습니다!`, 'success');
      
      // Reset Form State
      state.editingSpaceId = null;
      btn.innerHTML = `<i data-lucide="check"></i> <span>공간 개설하기</span>`;
    } else {
      // Create Space
      await supabaseDb.createSpace(spaceData);
      showToast(`"${space_name}" 공간이 성공적으로 개설되었습니다!`, 'success');
      btn.innerHTML = `<i data-lucide="check"></i> <span>공간 개설하기</span>`;
    }

    document.getElementById('hostForm').reset();
    
    // Switch to space list tab
    switchTab('tab-list');
    await loadData();
  } catch (err) {
    console.error(err);
    showToast('작업 처리 중 오류가 발생했습니다. 입력 정보를 확인하세요.', 'error');
    btn.innerHTML = `<i data-lucide="check"></i> <span>${isEditing ? '공간 정보 수정 완료' : '공간 개설하기'}</span>`;
  } finally {
    btn.disabled = false;
    lucide.createIcons();
  }
}

// Join Space Submit
async function handleJoinFormSubmit(e) {
  e.preventDefault();
  
  const space_id = document.getElementById('joinSpaceId').value;
  const user_name = document.getElementById('joinName').value.trim();
  const user_phone = document.getElementById('joinPhone').value.trim();
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
    const newReg = await supabaseDb.createRegistration(regData);

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
    const success = await supabaseDb.deleteRegistration(regId, phoneCode);
    if (success) {
      // Remove from my list
      state.myRegistrationIds = state.myRegistrationIds.filter(id => id !== regId);
      localStorage.setItem('our_space_my_regs', JSON.stringify(state.myRegistrationIds));

      showToast('참석 신청이 취소되었습니다.', 'info');
      await loadData();
    } else {
      showToast('참석 신청 취소에 실패했습니다.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('취소 처리 중 오류가 발생했습니다. 정보가 불일치할 수 있습니다.', 'error');
  }
}

// Cancel Host Space (Delete Space)
async function deleteHostSpace(spaceId, hostPhone) {
  try {
    const success = await supabaseDb.deleteSpace(spaceId, hostPhone);
    if (success) {
      showToast('모임 공간이 삭제(취소)되었습니다.', 'info');
      closeModal();
      await loadData();
    } else {
      showToast('공간 삭제에 실패했습니다.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('오류가 발생했습니다. 개설 정보를 삭제하지 못했습니다.', 'error');
  }
}

// Switch Tabs
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // If leaving host tab, reset edit state if form was abandoned
  if (tabId !== 'tab-host' && state.editingSpaceId !== null) {
    state.editingSpaceId = null;
    document.getElementById('hostForm').reset();
    const submitBtn = document.getElementById('btnSubmitSpace');
    submitBtn.innerHTML = `<i data-lucide="check"></i> <span>공간 개설하기</span>`;
  }

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

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase and load data
  initSupabase();
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
});
