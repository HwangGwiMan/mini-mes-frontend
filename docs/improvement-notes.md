# 프론트엔드 개선 검토 사항

> 현재 코드베이스 분석을 통해 도출된 아키텍처·UI/UX 개선 포인트.
> 업무 기능 개발과 무관한 코드 품질 및 사용자 경험 관점의 개선 사항이다.

---

## 우선순위 요약

| # | 항목 | 우선순위 | 영역 |
|---|------|----------|------|
| 1 | ~~에러 처리 통일 (토스트 알림)~~ ✅ | 🔴 높음 | UX / 아키텍처 |
| 2 | ~~삭제 확인 다이얼로그 통일~~ ✅ | 🔴 높음 | UX |
| 3 | ~~API 에러 응답 타입 중앙화~~ ✅ | 🔴 높음 | 타입 안전성 |
| 4 | ~~성공 피드백 추가~~ ✅ | 🟡 중간 | UX |
| 5 | ~~공통코드 옵션 캐싱~~ ⛔ 보류 | 🟡 중간 | 성능 |
| 6 | ~~`RevenueView` → `useCrudPage` 전환~~ ✅ | 🟡 중간 | 유지보수성 |
| 7 | ~~클라이언트 사이드 입력 검증~~ ✅ | 🟡 중간 | UX |
| 8 | ~~컬럼 정의 패턴 통일~~ ✅ | 🔵 낮음 | 코드 일관성 |
| 9 | ~~날짜 범위 검색 유효성 검사~~ ✅ | 🔵 낮음 | UX |
| 10 | 페이지네이션 | 🔵 낮음 | 확장성 |
| 11 | `BaseFormModal` 추상화 | 🔵 낮음 | 유지보수성 |

---

## 1. 에러 처리 통일 🔴 ✅ 완료

### 문제

화면마다 에러 처리 방식이 제각각이다.

| 화면 | 에러 표시 방식 |
|------|----------------|
| `PartnerView` | 모달 내 `errorMsg` prop |
| `QuoteView` | 모달 내 errorMsg + 브라우저 `alert()` 혼용 |
| `RevenueView` | 브라우저 `alert()` |
| `CommonCodeView` | `alert()` |

브라우저 기본 `alert()`은 모달이 열린 상태에서 표시되면 레이어 순서가 깨지고, UI 흐름을 차단하며, 프로젝트 전체 디자인 시스템과 무관하게 동작한다.

### 개선 방향

Toast 알림 컴포넌트를 도입하여 비차단(non-blocking) 방식으로 통일한다.

```
// 권장 구조
src/components/AppToast.vue        ← 화면 우상단 고정 토스트 UI
src/composables/useToast.ts        ← 토스트 상태 관리 composable
```

```typescript
// 사용 예시
const { showSuccess, showError } = useToast()

// 성공
showSuccess('저장되었습니다.')

// 실패
showError('서버 오류가 발생했습니다.')
```

`useCrudPage`의 `handleSave`, `handleDelete` 내부에서 `showSuccess` / `showError`를 호출하도록 통합하면, 모든 CRUD 화면에 일괄 적용된다.

---

## 2. 삭제 확인 다이얼로그 통일 🔴 ✅ 완료

### 문제

| 화면 | 삭제 확인 방식 |
|------|----------------|
| `PartnerView`, `ItemView` | 커스텀 확인 모달 ✅ |
| `CommonCodeView` | 브라우저 `confirm()` ❌ |
| `RevenueView` | 브라우저 `confirm()` ❌ |

브라우저 기본 `confirm()`은 디자인이 일관되지 않으며, 일부 환경(내장 브라우저, PWA)에서는 동작하지 않는다.

### 개선 방향

```
src/components/ConfirmDialog.vue   ← 공통 확인 다이얼로그
src/composables/useConfirm.ts      ← Promise 기반 호출 인터페이스
```

```typescript
// 사용 예시
const confirmed = await useConfirm('삭제하시겠습니까?')
if (confirmed) await deleteFn(id)
```

`useCrudPage`의 `confirmDelete` / `handleDelete` 흐름에 통합하면 일괄 적용된다.

---

## 3. API 에러 응답 타입 중앙화 🔴 ✅ 완료

### 문제

각 뷰에서 동일한 인라인 타입 단언이 반복된다.

```typescript
// PartnerView, QuoteView, RevenueView 등 공통 반복 패턴
const e = err as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }
const msg = e.response?.data?.message ?? '오류가 발생했습니다.'
```

### 개선 방향

```
src/types/api-error.ts   ← 공통 에러 응답 타입 + 헬퍼 함수
```

```typescript
// src/types/api-error.ts
export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  message?: string
  errors?: ApiFieldError[]
}

export function extractErrorMessage(err: unknown, fallback = '오류가 발생했습니다.'): string {
  const e = err as { response?: { data?: ApiErrorResponse } }
  return e.response?.data?.message ?? fallback
}
```

---

## 4. 성공 피드백 추가 🟡 ✅ 완료

### 문제

현재 CRUD 성공 후 아무런 시각적 피드백 없이 모달만 닫힌다. 사용자가 저장 여부를 확인할 수 없다.

### 개선 방향

항목 1(토스트 도입) 완료 후, `useCrudPage`의 `handleSave` / `handleDelete` 에 성공 메시지를 추가한다.

```typescript
// useCrudPage.ts 내부 (수정 예시)
await createFn(payload)
showSuccess('등록되었습니다.')
```

---

## 5. 공통코드 옵션 캐싱 🟡 ⛔ 보류

### 문제

`onMounted`마다 `commonCodeApi.search(groupCode)`를 호출하므로, 동일한 공통코드 그룹을 여러 화면에서 반복 조회한다. 특히 거래처 화면 → 수주 화면 이동 시 동일한 코드 목록을 중복 요청한다.

### 보류 사유

- 다른 사용자가 공통코드를 수정한 경우 캐시 무효화 방법이 없어 stale 데이터 노출 위험이 있다.
- TTL 방식으로 절충할 수 있으나, 공통코드는 변경 빈도가 낮고 데이터량도 작아 캐싱 도입 대비 복잡도 증가가 더 크다.

---

## 6. `RevenueView` → `useCrudPage` 전환 🟡 ✅ 완료

### 문제

`RevenueView`는 구조가 다른 CRUD 화면(`PartnerView`, `ItemView` 등)과 동일하지만, composable을 사용하지 않고 모든 상태와 핸들러를 인라인으로 정의하고 있다. 코드 중복이 많고 유지보수 시 수정 지점이 두 곳(composable + RevenueView)이 된다.

### 개선 방향

`useCrudPage`를 사용하도록 리팩토링한다. `RevenueDto.name` 필드(`revenueNumber`와 동일한 값)가 이미 `name: string` 요건을 충족하도록 DTO에 매핑되어 있으므로 composable 제약을 만족한다.

---

## 7. 클라이언트 사이드 입력 검증 🟡 ✅ 완료

### 문제

현재 폼 검증은 서버 응답(400 Bad Request)에 전적으로 의존한다. 아래 케이스를 사전에 잡지 못한다.

- 필수 항목 누락 (HTML5 `required`는 있으나 스타일 피드백 없음)
- 날짜 범위 역전 (`fromDate > toDate`)
- 수량 0 이하 입력
- 라인 항목 없이 저장 시도 (QuoteFormModal, OrderFormModal은 버튼만 비활성화)

### 개선 방향

`CrudModal`에 `validate` 옵션 prop을 추가하거나, 전용 폼 모달에서 `handleSubmit` 직전에 검증 함수를 실행한다.

```typescript
// 간단한 패턴 예시
function validate(): string | null {
  if (!form.revenueDate) return '매출일은 필수입니다.'
  if (lines.value.length === 0) return '매출 항목을 1개 이상 추가해야 합니다.'
  return null
}

async function handleSubmit() {
  const err = validate()
  if (err) { errorMsg.value = err; return }
  // ...
}
```

---

## 8. 컬럼 정의 패턴 통일 🔵 ✅ 완료

### 문제

화면마다 TanStack Table 컬럼을 정의하는 방식이 다르다.

| 화면 | 패턴 |
|------|------|
| `PartnerView` | `computed()` + `createColumnHelper` |
| `CommonCodeView` | 정적 배열 + `createColumnHelper` |
| `RevenueView` | `ColumnDef<T>[]` 정적 배열 (columnHelper 미사용) |
| `QuoteView` | `computed()` + `ColumnDef<T>[]` 혼용 |

### 권장 패턴

`createColumnHelper`를 사용한 정적 배열로 통일한다. 공통코드 라벨 변환처럼 반응형 데이터가 필요한 경우에만 `computed()`로 감싼다.

```typescript
// 권장 패턴
const columnHelper = createColumnHelper<PartnerDto>()
const columns = [
  columnHelper.accessor('code', { header: '코드', enableSorting: true }),
  columnHelper.accessor('name', { header: '거래처명' }),
]

// 반응형 데이터 참조가 필요한 경우
const columns = computed(() => [
  columnHelper.accessor('tradeTypeCode', {
    header: '거래구분',
    cell: (info) => tradeTypeOptions.value.find(o => o.value === info.getValue())?.label ?? info.getValue(),
  }),
])
```

---

## 9. 날짜 범위 검색 유효성 검사 🔵

### 문제

`SearchBar`에서 `fromDate`가 `toDate`보다 나중이어도 그대로 API를 호출한다. 서버는 빈 결과를 반환하지만, 사용자는 이유를 알 수 없다.

### 개선 방향

알람을 띄우는 대신, 입력 자체를 제한한다. `SearchBar`의 `date` 타입 필드에 `:min`/`:max` 속성을 동적으로 바인딩하여 역전된 날짜를 선택할 수 없게 만든다.

- `fromDate` 필드: `:max="modelValue.toDate || undefined"` — 종료일 이후 선택 불가
- `toDate` 필드: `:min="modelValue.fromDate || undefined"` — 시작일 이전 선택 불가

`fromDate`/`toDate` 키 네이밍 컨벤션을 기준으로 자동 연결하면 모든 화면에 일괄 적용된다.

```html
<input
  type="date"
  :max="field.key === 'fromDate' ? (modelValue.toDate || undefined) : undefined"
  :min="field.key === 'toDate' ? (modelValue.fromDate || undefined) : undefined"
/>
```

---

## 10. 페이지네이션 🔵

### 문제

현재 모든 데이터를 한 번에 로드한다. 수주·매출 데이터가 수백 건 이상 쌓이면 초기 로딩 속도와 테이블 렌더링 성능에 영향이 생긴다.

### 개선 방향

`DataTable` 컴포넌트에 페이지네이션 옵션을 추가하고, 백엔드 API에 `page` / `size` 파라미터를 지원한다. 단, 현재 데이터 규모에서는 필수 우선순위가 낮으므로, 문제가 실제로 발생하는 시점에 도입한다.

---

## 11. `BaseFormModal` 추상화 🔵

### 문제

`QuoteFormModal`, `OrderFormModal`, `RevenueFormModal`, `ShipmentFormModal` 5개 모달이 동일한 껍데기 코드(Teleport, Transition, 오버레이, 헤더, 에러 표시, 푸터 버튼)를 중복으로 가지고 있다. 모달 스타일이나 애니메이션 변경 시 5곳을 모두 수정해야 한다.

### 개선 방향

공통 껍데기를 `BaseFormModal.vue`로 추출하고 슬롯으로 폼 내용을 주입한다. 각 전용 모달은 도메인 로직만 소유하고 껍데기는 `BaseFormModal`에 위임한다.

```vue
<!-- BaseFormModal.vue — 공통 껍데기 -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="...overlay..." @mousedown.self="$emit('update:modelValue', false)">
        <div class="...panel..." :class="panelClass">
          <div class="header">
            <slot name="title"><h3>{{ title }}</h3></slot>
            <CloseButton @click="$emit('update:modelValue', false)" />
          </div>
          <form @submit.prevent="$emit('submit')" class="...">
            <slot />
            <ErrorMessage v-if="errorMsg" :message="errorMsg" />
            <slot name="footer">
              <ModalFooter :submitting :submit-disabled @cancel="$emit('update:modelValue', false)" />
            </slot>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

추가로 `QuoteFormModal`과 `OrderFormModal`의 라인 테이블 구조가 거의 동일하므로 `LineItemTable.vue` 공통 컴포넌트로 분리도 검토한다.

---

## 참고: 현재 패턴 일관성 현황

| 기능 | 패턴 | 일관성 | 품질 |
|------|------|--------|------|
| CRUD 목록 | `useCrudPage` + `DataTable` | 100% | 높음 |
| 검색 | `SearchBar` + `reactive` | 100% | 중간 (디바운싱 없음) |
| 폼 | `CrudModal` 또는 전용 모달 | 60% (혼용) | 중간~높음 |
| 에러 처리 | 모달 + `alert()` + 없음 | 20% | 낮음 |
| 로딩 상태 | 스피너 / 스켈레톤 / 비활성화 | 60% | 중간 |
| 타입 안전성 | DTO + 느슨한 폼 | 70% | 중간 |
| 삭제 확인 | 커스텀 모달 + `confirm()` | 50% | 중간 |
| 모달 렌더링 | Teleport + Transition | 100% | 높음 |
| 인증 가드 | 라우터 가드 | 100% | 높음 |
