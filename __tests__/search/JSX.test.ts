import { search } from '/search'
import { compareCode } from '/astUtils';
import path from 'path'
import { getFilesList } from '/getFilesList'
import fs from 'fs';


describe('JSX', () => {
  let filesList = [] as string[]

  beforeAll(async () => {
    filesList = await getFilesList(path.resolve(__dirname, '__fixtures__'))
  })

  const tempFilePath = path.join(__dirname, `${Date.now()}.temp`)
  const mockedFilesList = [tempFilePath]
  beforeAll(() => {
    fs.writeFileSync(tempFilePath, `
      <>
        <Flex >
      
            <Button
          >
              Press to 
              Download
            </Button>

        </Flex>

        <Button>
          Press to
          Download
        </Button>
      </>
    `)
  })

  afterAll(() => {
    fs.unlinkSync(tempFilePath)
  })

  it('Should find all self-closing JSX', () => {
    const query = `<$ />`
    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: [query],
    })
    expect(matches.length).toBe(148)
  })

  it('Should find JSX by tag name and prop', () => {
    const query = `
      <Drawer.Section title="Preferences">
      </Drawer.Section>
    `
    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: [query],
    })

    const resultCode = `
      <Drawer.Section title="Preferences">
        <TouchableRipple onPress={toggleTheme}>
          <View style={styles.preference}>
            <Text>Dark Theme</Text>
            <View pointerEvents="none">
              <Switch value={isDarkTheme} />
            </View>
          </View>
        </TouchableRipple>
        <TouchableRipple onPress={_handleToggleRTL}>
          <View style={styles.preference}>
            <Text>RTL</Text>
            <View pointerEvents="none">
              <Switch value={isRTL} />
            </View>
          </View>
        </TouchableRipple>
      </Drawer.Section>
    `

    expect(compareCode(matches[0].code, resultCode)).toBeTruthy()
  })

  it('Should find JSX by prop name', () => {
    const query = `<$ value={$$} />`
    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: [query],
    })
    expect(matches.length).toBe(41)
  })

  it('Should find JSX by text content', () => {
    const query = `<Text>RTL</Text>`
    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: [query],
    })
    expect(matches.length).toBe(1)
  })

  it('Should find JSX by text content regardless formatting', () => {
    const query = `
      <Button>
        Press to 
        Download
      </Button>
    `
    const { matches } = search({
      mode: 'include',
      filePaths: mockedFilesList,
      queryCodes: [query],
    })
    expect(matches.length).toBe(2)
  })

  it('Should find JSX by text content with wildcard case insensitive', () => {
    const query = `<Text>r$L</Text>`
    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: [query],
      caseInsensitive: true
    })
    expect(matches.length).toBe(1)
  })

  it('Should find JSX by text content case insensitive', () => {
    const query = `<Text>rtl</Text>`
    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      caseInsensitive: true,
      queryCodes: [query],
    })
    expect(matches.length).toBe(1)
  })

  it('Should find exact multiline JSX', () => {
    const query = `
      <View style={styles.preference}>
        <Text>Outlined</Text>
        <Switch
          value={isOutlined}
          onValueChange={() =>
            setIsOutlined((prevIsOutlined) => !prevIsOutlined)
          }
        />
      </View>
    `
    const { matches } = search({
      mode: 'exact',
      filePaths: filesList,
      queryCodes: [query],
    })

    expect(compareCode(matches[0].code, query)).toBeTruthy()
  })

  it('Should find components using useTheme() hook', () => {

    const usageQuery = `
      const $$ = useTheme();
    `

    const importQuery = `
      import {
        useTheme,
      } from 'react-native-paper';
    `

    const { matches: resultsUsage } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: [usageQuery],
    })

    const { matches: resultsImport } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: [importQuery],
    })
    expect(resultsImport.length).not.toBe(0)

    expect(resultsImport.length).toBe(resultsUsage.length)
  })

  it('Should find all usages of component passed as a prop', () => {
    const query1 = `
      <$$
        $={() => (
          <IconButton />
        )}
      />
    `

    const query2 = `
      <$$
        $={IconButton}
      />
    `
    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: [query1, query2],
    })

    expect(matches.length).toBe(2)
  })

  it('Should find all anonymous functions passed as a prop', () => {
    const queries = [
      `
      <$$
        $={() => $$}
      />
    `,
      `
      <$$
        $={() => $$}
      >
      </$$>
    `
    ]

    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: queries,
    })

    const firstResultCode = `
      <Drawer.Item {...props} key={props.key} theme={props.key === 3 ? {
        colors: {
          primary: Colors.tealA200
        }
      } : undefined} active={drawerItemIndex === index} onPress={() => _setDrawerItem(index)} 
      />
    `

    expect(matches.length).toBe(190)
    expect(compareCode(matches[0].code, firstResultCode)).toBeTruthy()
  })

  it('Should find all anonymous functions passed as event listener handler', () => {
    const queries = [
      `
      <$$
        on$={() => $$}
      />
    `,
      `
      <$$
        on$={() => $$}
      >
      </$$>
    `
    ]

    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: queries,
    })

    const firstResultCode = `
      <Drawer.Item {...props} key={props.key} theme={props.key === 3 ? {
        colors: {
          primary: Colors.tealA200
        }
      } : undefined} active={drawerItemIndex === index} onPress={() => _setDrawerItem(index)} 
      />
    `

    expect(matches.length).toBe(164)
    expect(compareCode(matches[0].code, firstResultCode)).toBeTruthy()
  })

  it('Should find all Elements pretending to be a wrapper', () => {
    const queries = [
      `
      <$Wrapper/>
    `,
      `
      <$Wrapper>
      </$Wrapper>
    `
    ]

    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(34)
  })

  it('Should find all title prop values which are strings', () => {
    const queries = [
      `
      <$$ title="$" />
    `,
      `
      <$$ title="$">
      </$$>
    `,
      `
      <$$ title={"$"} />
    `,
      `
      <$$ title={"$"}>
      </$$>
    `
    ]

    const { matches } = search({
      mode: 'include',
      filePaths: filesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(78)
  })

  it('Should ignore all empty JSXText in search', () => {
    const queries = [
      `
        <$>
          $
        </$>;
    `]

    const { matches } = search({
      mode: 'include',
      filePaths: mockedFilesList,
      queryCodes: queries,
    })

    expect(matches.length).toBe(2)
    expect(compareCode(matches[0].code,
      ` <Button>
          Press to 
          Download
        </Button>
      `
    )).toBeTruthy()
  })


})