import { Box, useToast, Stack, Card, CardHeader, Heading, Divider, CardBody, FormControl, FormLabel, Input, FormHelperText, FormErrorMessage, CardFooter, Button, Checkbox } from '@chakra-ui/react'
import { Signer, utils } from 'koilib'
import { useRouter } from 'next/router'
import { useState, ChangeEvent } from 'react'
import Nav from '../../components/Nav'
import { useWallets } from '../../context/WalletsProvider'
import { isAlphanumeric } from '../../util/Utils'

export default function ImportAccount() {
  const router = useRouter()
  const toast = useToast()

  const { importAccount, wallets, isLocked } = useWallets()

  const { walletIndex } = router.query

  const [accountName, setAccountName] = useState('')
  const [accountPrivateKey, setAccountPrivateKey] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [watchMode, setWatchMode] = useState(false)

  let walletIndexNum: number

  const handleAccountNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccountName(e.target.value)
  }

  const handleAccountAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccountAddress(e.target.value)
  }

  const handleAccountPrivateKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAccountPrivateKey(e.target.value)

    if (utils.isChecksumWif(e.target.value)) {
      setAccountAddress(Signer.fromWif(e.target.value).getAddress())
    } else {
      setAccountAddress('')
    }
  }

  const handleWatchModeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWatchMode(e.target.checked)
  }

  const importAccountClick = async () => {
    setIsLoading(true)

    try {
      if (!walletIndex) {
        throw new Error('missing walletIndex')
      }

      await importAccount(walletIndexNum, accountName, accountAddress, accountPrivateKey)
      setAccountPrivateKey('')

      router.push('/dashboard')

      toast({
        title: 'Account successfully imported',
        description: 'Your account was successfully imported!',
        status: 'success',
        isClosable: true,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'An error occured while importing the account',
        description: (error as Error).message,
        status: 'error',
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const isAccountNameInvalid = accountName.length < 1 || !isAlphanumeric(accountName)
  const isAccountAddressInvalid = watchMode && !utils.isChecksumAddress(accountAddress)
  const isAccountPrivateKeyInvalid = !watchMode && !utils.isChecksumWif(accountPrivateKey)

  walletIndexNum = walletIndex ? parseInt(walletIndex as string) : 0

  const walletName = !isLocked ? wallets[walletIndexNum].name : ''

  return (
    <>
      <Nav />
      <Box padding={{ base: 4, md: 8 }} margin='auto' maxWidth='1024px'>
        <Stack mt='6' spacing='3' align='center'>
          <Card maxW='sm'>
            <CardHeader>
              <Heading size='md'>
                Import account to wallet &quot;{walletName}&quot;
              </Heading>
            </CardHeader>
            <Divider />
            <CardBody>
              <Stack mt='6' spacing='3'>
                <FormControl isRequired isInvalid={isAccountNameInvalid}>
                  <FormLabel>Account Name</FormLabel>
                  <Input value={accountName} onChange={handleAccountNameChange} />
                  <FormHelperText>The account name is an easy way for you to identify an account.</FormHelperText>
                  {
                    isAccountNameInvalid && <FormErrorMessage>The account name must be at least 1 character and can only composed of the following characters (_-[0-9][a-z][A-Z]).</FormErrorMessage>
                  }
                </FormControl>
                <FormControl isRequired>
                  <Checkbox isChecked={watchMode} onChange={handleWatchModeChange}>Import in Watch Mode (when checking this box you will not be able to sign transactions with this account).</Checkbox>
                </FormControl>
                {
                  watchMode &&
                  <FormControl isRequired isInvalid={isAccountAddressInvalid}>
                    <FormLabel>Account Address</FormLabel>
                    <Input value={accountAddress} onChange={handleAccountAddressChange} />
                    <FormHelperText>The account&apos;s address to import in Watch Mode.</FormHelperText>
                    {
                      isAccountAddressInvalid && <FormErrorMessage>The account address entered is invalid.</FormErrorMessage>
                    }
                  </FormControl>
                }
                {
                  !watchMode &&
                  <>
                    <FormControl isRequired isInvalid={isAccountPrivateKeyInvalid}>
                      <FormLabel>Account Private Key (WIF format)</FormLabel>
                      <Input type='password' value={accountPrivateKey} onChange={handleAccountPrivateKeyChange} />
                      <FormHelperText>The account&apos;s private key your want to import in the WIF format.</FormHelperText>
                      {
                        isAccountPrivateKeyInvalid && <FormErrorMessage>The Private Key entered is invalid.</FormErrorMessage>
                      }
                    </FormControl>
                    <FormControl isReadOnly={true}>
                      <FormLabel>Account Address</FormLabel>
                      <Input value={accountAddress} />
                      <FormHelperText>The account&apos;s address associated with the above Private Key.</FormHelperText>
                    </FormControl>
                  </>
                }
              </Stack>
            </CardBody>
            <Divider />
            <CardFooter>
              <Button
                disabled={isAccountNameInvalid || !walletIndex || isAccountPrivateKeyInvalid || isAccountAddressInvalid}
                isLoading={isLoading}
                variant='solid'
                colorScheme='green'
                onClick={importAccountClick}>
                Import Account
              </Button>
            </CardFooter>
          </Card>
        </Stack>
      </Box>
    </>
  )
}