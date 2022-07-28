import { searchInFileSystem } from '/searchInFs'
import { compareCode } from '/astUtils'
import path from 'path'
import { getFilesList } from '/getFilesList'
import fs from 'fs'

describe('functions', () => {
  let filesList = [] as string[]

  beforeAll(async () => {
    filesList = await getFilesList({
      searchRoot: path.resolve(__dirname, '__fixtures__'),
      omitGitIgnore: true,
    })
  })

  const tempFilePath = path.join(__dirname, `${Date.now()}.temp`)
  const mockedFilesList = [tempFilePath]

  beforeAll(() => {
    fs.writeFileSync(
      tempFilePath,
      `
      (a,b,c) => {};
      (a,d) => {};
      (a, { b}) => {};

    `,
    )
  })

  afterAll(() => {
    fs.unlinkSync(tempFilePath)
  })

  it('should match inline types in function params', () => {
    const queries = [
      `
      const $$ = ({
        $$,
      }: {
        $$: () => $$$;
      }) => $$$
      `,
      `
        const $$ = ({
          $$,
        }: {
          $$: () => $$$;
        }) => {}
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(4)
  })

  it('should match exact function with body', () => {
    const queries = [
      `
      const onScroll = ({
        nativeEvent
      }: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0;
      
        if (!isIOS) {
          return velocity.setValue(currentScrollPosition);
        }
      
        setExtended(currentScrollPosition <= 0);
      };
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'exact',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(1)
    expect(compareCode(matches[0].code, queries[0])).toBeTruthy()
  })

  it('should match function with body statements in order with exact statements', () => {
    const queries = [
      `
      const onScroll = ({
        nativeEvent
      }: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0;
      

        if (!isIOS) {
          return velocity.setValue(currentScrollPosition);
        }
      
        setExtended(currentScrollPosition <= 0);

      };
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include-with-order',
      filePaths: filesList,
      queryCodes: queries,
    })
    expect(matches.length).toBe(1)
  })

  it('should match function with body statements in order but without all statements', () => {
    const queries = [
      `
      const onScroll = ({
        nativeEvent
      }: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0;
      

        if (!isIOS) {
          return velocity.setValue(currentScrollPosition);
        }
      
      };
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include-with-order',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(1)
  })

  it('should not match function with body statements in different order', () => {
    const queries = [
      `
      const onScroll = ({
        nativeEvent
      }: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0;
      
        setExtended(currentScrollPosition <= 0);

        if (!isIOS) {
          return velocity.setValue(currentScrollPosition);
        }
      
      };
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include-with-order',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(0)
  })

  it('should not match function with body statements in different order without all statements', () => {
    const queries = [
      `
      const onScroll = ({
        nativeEvent
      }: NativeSyntheticEvent<NativeScrollEvent>) => {

        if (!isIOS) {
          return velocity.setValue(currentScrollPosition);
        }

        const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0;
      
      };
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include-with-order',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(0)
  })

  it('should match function with body statements in different order', () => {
    const queries = [
      `
      const onScroll = ({
        nativeEvent
      }: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0;
      
        setExtended(currentScrollPosition <= 0);

        if (!isIOS) {
          return velocity.setValue(currentScrollPosition);
        }
      
      };
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(1)
  })

  it('should match function with body statements in different order without all statements', () => {
    const queries = [
      `
      const onScroll = ({
        nativeEvent
      }: NativeSyntheticEvent<NativeScrollEvent>) => {

        if (!isIOS) {
          return velocity.setValue(currentScrollPosition);
        }

        const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0;
      
      };
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(1)
  })

  it('should match function with 2 arguments', () => {
    const queries = [
      `
      ($$_ref1, $$_ref2) => {}
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include',
      filePaths: mockedFilesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(2)
  })

  it('should match function with 2 arguments using double wildcard', () => {
    const queries = [
      `
      ($$_ref1, $$$_ref2) => {}
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include',
      filePaths: mockedFilesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(3)
  })

  it('should match function with 3 arguments', () => {
    const queries = [
      `
      ($$_ref1, $$_ref2, $$_ref3) => {}
      `,
    ]

    const { matches } = searchInFileSystem({
      mode: 'include',
      filePaths: mockedFilesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(1)
  })
})
