# Frontend 개발 가이드

> Mini MES 프론트엔드 화면 개발 시 참고하는 공통 구조, 컴포넌트, 컴포저블 정리 문서

---

## 1. 기술 스택

| 분류 | 라이브러리 | 용도 |
|---|---|---|
| UI 프레임워크 | Vue 3 + TypeScript | Composition API |
| 빌드 도구 | Vite | 개발 서버 및 번들링 |
| 스타일링 | Tailwind CSS v4 | 유틸리티 클래스 |
| 라우팅 | Vue Router | SPA 라우팅, 인증 가드 |
| 상태 관리 | Pinia | 인증 토큰/사용자 정보 |
| HTTP 클라이언트 | Axios | API 호출, JWT 인터셉터 |
| 그리드 | @tanstack/vue-table | 컬럼 정렬/표시/순서 |
| 아이콘 | lucide-vue-next | UI 아이콘 |
| 유틸리티 | @vueuse/core | 컴포저블 유틸리티 |

---

## 2. 프로젝트 구조

```
src/
├── api/                    # API 호출 함수 + 타입 정의
│   ├── index.ts            # Axios 인스턴스 (인터셉터 포함)
│   ├── auth.ts             # 로그인/회원가입 API
│   ├── partner.ts          # 거래처 CRUD API
│   ├── item.ts             # 품목 CRUD API
│   └── commonCode.ts       # 공통코드 조회 API
│
├── components/             # 공통 컴포넌트
│   ├── DataTable.vue       # TanStack Table 래핑 그리드
│   ├── CrudModal.vue       # 등록/수정 공통 모달
│   └── SearchBar.vue       # 검색 조건 입력 영역
│
├── composables/            # 공통 로직 컴포저블
│   ├── useCrudPage.ts      # CRUD 화면 공통 상태/함수
│   ├── useColumnSettings.ts # 컬럼 설정 localStorage 관리
│   └── useScreenInit.ts    # 화면 진입 시 권한 체크
│
├── config/
│   └── menus.ts            # 사이드바 메뉴 구조 정의
│
├── layouts/
│   ├── DefaultLayout.vue   # Header + Sidebar + Content 레이아웃
│   ├── AppHeader.vue       # 상단 헤더 (제목, 사용자 드롭다운)
│   └── AppSidebar.vue      # 좌측 사이드바 (메뉴 렌더링)
│
├── router/
│   └── index.ts            # 라우트 정의 + 인증 가드
│
├── stores/
│   └── auth.ts             # Pinia 인증 스토어
│
└── views/                  # 화면 컴포넌트
    ├── LoginView.vue        # 로그인
    ├── DashboardView.vue    # 대시보드
    ├── PartnerView.vue      # 거래처 관리
    ├── ItemView.vue         # 품목 관리
    └── CommonCodeView.vue   # 공통코드 관리
```

---

## 3. 화면 레이아웃 구조

모든 인증 화면은 `DefaultLayout.vue`를 통해 렌더링됩니다.

```
┌──────────────────────────────────────────────────┐
│  AppHeader  (기준정보 > 거래처 관리     A admin ∨) │
├──────────────┬───────────────────────────────────┤
│              │  [1] 페이지 헤더       [신규 등록] │
│  AppSidebar  │  [2] SearchBar                    │
│  (메뉴 목록) │  [3] DataTable                    │
│              │       ├─ 컬럼 설정 ⚙              │
│              │       └─ 그리드 본문               │
│              │  [4] CrudModal (등록/수정)         │
│              │  [5] 삭제 확인 모달               │
└──────────────┴───────────────────────────────────┘
```

### 버튼 위치 규칙

| 버튼 | 위치 |
|---|---|
| 신규 등록 | 페이지 헤더 우측 (파란색 solid) |
| 검색 / 초기화 | SearchBar 내 우측 |
| 수정 / 삭제 | DataTable 행 우측 작업 컬럼 |
| 저장 / 취소 | 모달 내 우측 정렬 |

---

## 4. 공통 컴포넌트

### 4-1. `DataTable.vue`

| prop | 타입 | 필수 | 설명 |
|---|---|---|---|
| `data` | `T[]` | ✓ | 그리드 데이터 |
| `columns` | `ColumnDef<T>[]` | ✓ | TanStack Table 컬럼 정의 |
| `loading` | `boolean` | | 스켈레톤 로딩 표시 |
| `table-id` | `string` | | 컬럼 설정 저장용 키 (미전달 시 설정 버튼 미표시) |

**슬롯**
```html
<DataTable :data="rows" :columns="columns" table-id="partner">
  <template #actions="{ row }">
    <!-- 수정/삭제 버튼 -->
  </template>
</DataTable>
```

**컬럼 설정 패널** (`table-id` 전달 시 자동 활성화)
- 체크박스로 컬럼 표시/숨김 토글
- 드래그 핸들로 컬럼 순서 변경
- 설정값은 `localStorage`에 사용자별 저장 (키: `col-settings:{username}:{tableId}`)
- 초기화 버튼으로 기본 상태 복원

---

### 4-2. `CrudModal.vue`

| prop | 타입 | 필수 | 설명 |
|---|---|---|---|
| `modelValue` | `boolean` | ✓ | `v-model` 열림/닫힘 |
| `title` | `string` | ✓ | 모달 제목 |
| `fields` | `FieldDef[]` | ✓ | 폼 필드 정의 목록 |
| `initial-data` | `Record<string, string>` | | 수정 시 초기값 |
| `submitting` | `boolean` | | 저장 중 버튼 비활성화 |
| `error-msg` | `string` | | 오류 메시지 표시 |

**`FieldDef` 인터페이스**
```typescript
interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'number' | 'select'  // 기본값: 'text'
  required?: boolean
  placeholder?: string
  maxlength?: number
  min?: number                          // type='number' 전용
  options?: { value: string; label: string }[]  // type='select' 전용
}
```

**사용 예시**
```html
<CrudModal
  v-model="modalOpen"
  :title="editTarget ? '수정' : '등록'"
  :fields="fields"
  :initial-data="editTarget ? toFormData(editTarget) : undefined"
  :submitting="submitting"
  :error-msg="modalError"
  @confirm="handleSave"
/>
```

---

### 4-3. `SearchBar.vue`

| prop / emit | 타입 | 설명 |
|---|---|---|
| `:model-value` | `Record<string, string>` | `useCrudPage`의 `search` 반응형 객체 |
| `:fields` | `SearchFieldDef[]` | 렌더링할 검색 입력 필드 목록 |
| `@search` | 이벤트 | 검색 버튼 클릭 또는 Enter 시 발생 |
| `@reset` | 이벤트 | 초기화 버튼 클릭 시 발생 |

**`SearchFieldDef` 인터페이스**
```typescript
interface SearchFieldDef {
  key: string
  label: string
  placeholder?: string
}
```

**사용 예시**
```html
<SearchBar
  :model-value="search"
  :fields="searchFields"
  @search="fetchData"
  @reset="resetSearch"
/>
```

---

## 5. 공통 컴포저블

### 5-1. `useCrudPage<TDto, TReq>(options)`

CRUD 화면의 공통 상태와 함수를 제공합니다. `TDto`는 반드시 `id: number`와 `name: string` 필드를 가져야 합니다.

**`fetchFn`은 파라미터 없는 클로저로 전달합니다.** 각 뷰에서 검색 상태를 직접 관리하고 캡처합니다.

**옵션**
```typescript
{
  fetchFn:   () => Promise<{ data: TDto[] }>   // 외부 search 객체를 클로저로 캡처
  createFn:  (data: TReq) => Promise<unknown>
  updateFn:  (id: number, data: TReq) => Promise<unknown>
  deleteFn:  (id: number) => Promise<unknown>
  toPayload: (formData: Record<string, string>) => TReq
}
```

**반환값**
```typescript
// 상태
rows          // 목록 데이터 (Ref<TDto[]>)
loading       // 조회 중 여부
submitting    // 저장/삭제 중 여부
modalOpen     // CrudModal 열림 여부 (v-model 연결)
modalError    // 모달 오류 메시지
editTarget    // 수정 대상 (null이면 등록 모드)
deleteTarget  // 삭제 확인 대상

// 함수
fetchData()        // 목록 조회
openCreate()       // 등록 모달 열기
openEdit(row)      // 수정 모달 열기
handleSave(data)   // 저장 처리 (등록/수정 자동 분기)
confirmDelete(row) // 삭제 확인 대상 지정
handleDelete()     // 삭제 처리
```

> `search` 와 `resetSearch`는 composable이 제공하지 않습니다. 각 뷰에서 직접 정의하세요.
>
> ```typescript
> // 뷰 컴포넌트에서 직접 관리
> const search = reactive({ code: '', name: '' })
> function resetSearch() { search.code = ''; search.name = ''; fetchData() }
> ```

---

### 5-2. `useColumnSettings(tableId)`

컬럼 표시/순서 설정을 사용자별로 `localStorage`에 저장합니다. `DataTable.vue`가 내부적으로 사용하며, 직접 호출할 필요는 없습니다.

- 저장 키: `col-settings:{username}:{tableId}`
- 저장 형식: `{ visibility: { [colId]: boolean }, order: string[] }`

---

### 5-3. `useScreenInit()`

화면 진입 시 GraphQL로 현재 사용자 정보(`username`, `role`)를 조회합니다.
모든 화면의 `onMounted` 첫 번째로 호출해야 합니다.

```typescript
const { initialize } = useScreenInit()

onMounted(async () => {
  await initialize()
  // 이후 데이터 조회 로직
})
```

---

## 6. API 클라이언트

### Axios 인스턴스 (`src/api/index.ts`)

- `baseURL`: `VITE_API_BASE_URL` 환경변수 (기본값: `http://localhost:8080`)
- **Request 인터셉터**: `Authorization: Bearer {token}` 헤더 자동 주입
- **Response 인터셉터**: 401 응답 시 자동 로그아웃 + 로그인 화면 이동

### 환경변수 (`.env.local`)
```
VITE_API_BASE_URL=http://localhost:8080
```

---

## 7. 인증 및 라우팅

### 인증 스토어 (`stores/auth.ts`)

```typescript
const { token, username, isLoggedIn, login, logout } = useAuthStore()
```

- `token`, `username`: `localStorage` 자동 동기화
- `isLoggedIn`: `computed(() => !!token)`

### 라우터 가드

| 조건 | 동작 |
|---|---|
| 미인증 + `requiresAuth: true` 페이지 접근 | `/login` 으로 리다이렉트 |
| 인증 완료 + `/login` 접근 | `/` (대시보드) 으로 리다이렉트 |

---

## 8. 메뉴 추가 방법 (`src/config/menus.ts`)

새 도메인 화면을 추가할 때 `menus.ts`에만 항목을 추가하면 사이드바에 자동으로 반영됩니다.

```typescript
// 기존 그룹에 메뉴 추가
{
  type: 'leaf',
  key: 'new-screen',
  label: '새 화면',
  path: '/new-screen',
  icon: SomeIcon,
}

// 새 그룹 추가
{
  type: 'group',
  key: 'production',
  label: '생산관리',
  icon: Factory,
  children: [ ... ],
}
```

---

## 9. 새 CRUD 화면 개발 체크리스트

새 도메인 화면(예: 창고 관리)을 추가할 때 필요한 작업 목록입니다.

**백엔드**
- [ ] Entity / Repository 생성
- [ ] Request DTO (Bean Validation 포함) 생성
- [ ] Response DTO 생성
- [ ] Service (`findAll`, `create`, `update`, `delete`) 구현
- [ ] Controller (CRUD 엔드포인트) 구현

**프론트엔드**
- [ ] `src/api/{domain}.ts` 생성 — DTO 타입 + API 함수
- [ ] `src/views/{Domain}View.vue` 생성 — 아래 4가지 정의
  - `useCrudPage` 옵션 (`fetchFn`, `createFn`, `updateFn`, `deleteFn`, `toPayload`)
  - `columns` — 그리드 컬럼 정의
  - `fields` — 모달 폼 필드 정의 (`FieldDef[]`)
  - `searchFields` — 검색 필드 정의 (`SearchFieldDef[]`)
- [ ] `src/router/index.ts` 에 라우트 추가
- [ ] `src/config/menus.ts` 에 메뉴 항목 추가

**공통코드 연동이 필요한 경우 추가 작업**
- [ ] 백엔드 `DataInitializer`에 그룹코드 초기 데이터 추가
- [ ] `onMounted`에서 `commonCodeApi.search('{GROUP_CODE}')` 선조회
- [ ] `fields`에서 해당 필드를 `type: 'select'`, `options: ...` 로 정의
- [ ] `columns` 셀 렌더러에서 코드 → 명칭 변환 처리
