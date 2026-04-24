/**
 * 화면 초기화 composable.
 *
 * initialize()는 me 조회(현재 사용자)와 공통코드 그룹 조회를 GraphQL 단일 요청으로 통합한다.
 * GraphQL alias를 동적으로 생성해 요청 횟수를 화면 진입 시 1회로 줄인다.
 *
 * 설계 결정: docs/adr/0001-graphql-screen-init-with-common-codes.md
 */
import api from '@/api'

export interface CurrentUser {
  username: string
  role: string
  employeeId: number | null
}

export interface CodeOption {
  value: string
  label: string
}

export function useScreenInit() {
  /**
   * 현재 사용자와 공통코드 옵션을 GraphQL 단일 요청으로 조회한다.
   *
   * @param groupCodes 조회할 공통코드 그룹코드 목록.
   *   각 그룹코드가 GraphQL alias가 되므로 식별자 규칙(영문·숫자·언더스코어, 숫자 시작 불가)을 따라야 한다.
   * @returns currentUser — 현재 로그인 사용자 정보
   * @returns getCode(groupCode) — 그룹코드로 옵션 배열을 반환하는 헬퍼. 미요청 그룹은 빈 배열 반환
   */
  async function initialize(groupCodes: string[] = []): Promise<{
    currentUser: CurrentUser
    codes: Record<string, CodeOption[]>
    getCode: (groupCode: string) => CodeOption[]
  }> {
    // 그룹코드를 alias 필드로 변환: ITEM_TYPE: commonCodes(groupCode: "ITEM_TYPE") { code name }
    const groupFields = groupCodes
      .map(g => `${g}: commonCodes(groupCode: "${g}") { code name }`)
      .join('\n')

    const query = `{ me { username role employeeId }\n${groupFields} }`

    const response = await api.post<{ data: Record<string, unknown> }>('/graphql', { query })
    const { me, ...rest } = response.data.data

    const codes: Record<string, CodeOption[]> = {}
    for (const g of groupCodes) {
      codes[g] = ((rest[g] as { code: string; name: string }[]) ?? [])
        .map(c => ({ value: c.code, label: c.name }))
    }

    // Record 인덱스 접근이 undefined를 포함하는 타입으로 추론되므로 헬퍼로 안전하게 래핑
    const getCode = (groupCode: string): CodeOption[] => codes[groupCode] ?? []

    return { currentUser: me as CurrentUser, codes, getCode }
  }

  return { initialize }
}
