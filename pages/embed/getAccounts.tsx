import { useColorModeValue, Text, Box, Button, ButtonGroup, Card, CardBody, CardHeader, Checkbox, Divider, Heading, Skeleton, Stack, Center } from '@chakra-ui/react'
import { ReactElement, useEffect, useState } from 'react'
import useTranslation from 'next-translate/useTranslation'
import { Messenger } from '../../util/Messenger'
import { useWallets } from '../../context/WalletsProvider'
import { debug, truncateAccount } from '../../util/Utils'
import { GetAccountsArguments, GetAccountsResult, IAccount } from '../../wallet_connector_handlers/accountsHandler'
import type { NextPageWithLayout } from '../_app'
import { ACCOUNTS_CHILD_ID, ACCOUNTS_PARENT_ID } from '../../util/Constants'


const GetAccounts: NextPageWithLayout = () => {
  const { t } = useTranslation()

  const { wallets } = useWallets()

  const [requester, setRequester] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, Record<string, boolean>>>({})
  const [messenger, setMessenger] = useState<Messenger<GetAccountsArguments, GetAccountsResult | null>>()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const msgr = new Messenger<GetAccountsArguments, GetAccountsResult | null>(window.opener, ACCOUNTS_CHILD_ID, true, window.location.origin)
    setMessenger(msgr)

    const setupMessenger = async () => {

      await msgr.ping(ACCOUNTS_PARENT_ID)
      debug('connected to parent iframe')

      const { requester } = await msgr.sendRequest(ACCOUNTS_PARENT_ID, null)
      setRequester(requester)
      setIsLoading(false)
    }

    setupMessenger()


    return () => {
      msgr.removeListener()
    }
  }, [])

  useEffect(() => {
    const accounts: Record<string, Record<string, boolean>> = {}

    for (const walletId in wallets) {
      const wallet = wallets[walletId]
      accounts[walletId] = {}

      for (const accountId in wallet.accounts) {
        accounts[walletId][accountId] = false
      }
    }

    setSelectedAccounts({ ...accounts })
  }, [wallets])

  const updateSelectedAccounts = (walletId: string, accountId: string, checked: boolean) => {
    selectedAccounts[walletId][accountId] = checked

    setSelectedAccounts({ ...selectedAccounts })
  }

  const updateAllSelectedAccounts = (walletId: string, checked: boolean) => {
    for (const accountId in selectedAccounts[walletId]) {
      selectedAccounts[walletId][accountId] = checked
    }

    setSelectedAccounts({ ...selectedAccounts })
  }

  const hasLoadedAccounts = Object.keys(selectedAccounts).length > 0

  const onClickConfirm = () => {
    const accounts: IAccount[] = []

    for (const walletId in wallets) {
      const wallet = wallets[walletId]

      for (const accountId in wallet.accounts) {
        if (selectedAccounts[walletId][accountId] === true) {
          const account = wallet.accounts[accountId]

          accounts.push({
            address: account.public.address
          })
        }
      }
    }

    messenger!.sendMessage(ACCOUNTS_PARENT_ID, accounts)
  }

  const close = () => {
    self.close()
  }

  let hasSelectedOneAccount = false

  for (const walletId in selectedAccounts) {
    const wallet = selectedAccounts[walletId]

    for (const accountId in wallet) {
      if (selectedAccounts[walletId][accountId] === true) {
        hasSelectedOneAccount = true
        break
      }
    }

    if (hasSelectedOneAccount) {
      break
    }
  }

  return (
    <Center>
      <Stack>
        <Card>
          <CardHeader>
            <Heading size='md'>{t('getAccounts:accountsRequest')}</Heading>
          </CardHeader>
          <Divider />
          <CardBody>
            <Skeleton isLoaded={hasLoadedAccounts && !isLoading}>
              <Text>
              {t('getAccounts:selectAccountsToShare')} &quot;{requester}&quot;:
              </Text>
              <Divider marginTop={4} marginBottom={4} />
              {
                hasLoadedAccounts && Object.keys(wallets).map((walletId) => {
                  const wallet = wallets[walletId]
                  let allChecked = true

                  let oneAccountIsSelected = false
                  for (const accountId in wallet.accounts) {
                    if (selectedAccounts[walletId][accountId] === true) {
                      oneAccountIsSelected = true
                    } else {
                      allChecked = false
                    }
                  }

                  const isIndeterminate = oneAccountIsSelected && !allChecked

                  return (
                    <Box key={walletId}>
                      <Checkbox
                        isChecked={allChecked}
                        isIndeterminate={isIndeterminate}
                        onChange={(e) => updateAllSelectedAccounts(walletId, e.target.checked)}
                      >
                        <Heading size='sm'>{wallet.name}</Heading>
                      </Checkbox>
                      <Stack pl={6} mt={1} spacing={1}>
                        {
                          Object.keys(wallet.accounts).map((accountId) => {
                            const account = wallet.accounts[accountId]
                            return (
                              <Checkbox
                                key={`${walletId}-${accountId}`}
                                isChecked={selectedAccounts[walletId][accountId]}
                                onChange={(e) => updateSelectedAccounts(walletId, accountId, e.target.checked)}
                              >
                                {account.public.name} ({truncateAccount(account.public.address)})
                              </Checkbox>
                            )
                          })
                        }
                      </Stack>
                      <Divider marginTop={4} marginBottom={4} />
                    </Box>
                  )
                })
              }
            </Skeleton>
          </CardBody>
        </Card>
        <Box
          style={{ position: 'sticky', bottom: 0, WebkitMaskPosition: 'sticky' }}
          bg={useColorModeValue('gray.100', 'gray.900')}
        >
          <Card>
            <CardBody>
              <ButtonGroup spacing='6' width='100%'>
                <Button onClick={close} colorScheme='red'>{t('common:cancel')}</Button>
                <Button width='100%' disabled={isLoading || !hasSelectedOneAccount} onClick={onClickConfirm} colorScheme='green'>{t('common:confirm')}</Button>
              </ButtonGroup>
            </CardBody>
          </Card>
        </Box>
      </Stack>
    </Center>
  )
}

GetAccounts.getLayout = function getLayout(page: ReactElement) {
  return (
    page
  )
}

export default GetAccounts
