import { hashThread } from '../../../../hashThread'
import { useCallback, useState } from 'react'
import {
  FieldValues,
  Submit,
  Form,
  Label,
  SelectField,
  TextAreaField,
} from '@redwoodjs/forms'
import { KeyBody, usePrivateKeys } from 'src/components/KeyContext'
import { useMutation } from '@redwoodjs/web'
import { CreateThreadInput, Thread } from 'types/graphql'
import * as openpgp from 'openpgp'

const ADD_THREAD = gql`
  mutation AddThread($input: CreateThreadInput!) {
    createThread(input: $input) {
      hash
    }
  }
`

export type PostThreadProps = {
  replyTo?: Pick<Thread, 'hash'>
}

const PostThread = (props: PostThreadProps) => {
  const privateKeys = usePrivateKeys()
  const [addThread] = useMutation<
    { createThread: { hash: string } },
    { input: CreateThreadInput }
  >(ADD_THREAD)

  const handleSubmit = useCallback(
    (v: FieldValues) => {
      ;(async () => {
        const msg = await openpgp.createCleartextMessage({
          text: [
            props.replyTo?.hash ? `replyTo:${props.replyTo.hash}\n` : '',
            '\n',
            v.body,
          ]
            .join('\n')
            .trim(),
        })

        var pk = privateKeys.find((x) => x.getKeyID().toHex() === v['sk'])
        if (!pk.isPrivate()) {
          throw 'not a pk'
        }

        if (!pk.isDecrypted()) {
          const password = prompt(`Password to decrypt ${KeyBody(pk)}`)

          try {
            pk = await openpgp.decryptKey({
              privateKey: pk,
              passphrase: password,
            })
          } catch (e) {}
        }

        const signedMsg = await openpgp.sign({
          message: msg,
          signingKeys: [pk],
          format: 'armored',
        })

        const res = await addThread({
          variables: {
            input: {
              clearText: signedMsg,
            },
          },
        })

        window.location.href = `/t/${res.data.createThread.hash}`
      })()
    },
    [privateKeys, addThread]
  )

  return (
    <div className="w-5/6 border border-solid border-black bg-white">
      <Form onSubmit={handleSubmit}>
        <Label name="body" className="px-2">
          {props.replyTo ? `Reply to ${props.replyTo.hash}` : 'Body:'}
        </Label>
        <TextAreaField
          name="body"
          className="w-full bg-slate-200"
          rows={10}
          required
        />
        <div className="flex flex-col md:flex-row">
          <SelectField required name="sk" className="w-8/10 w-full p-2">
            {privateKeys.map((key) => (
              <option value={key.getKeyID().toHex()}>{KeyBody(key)}</option>
            ))}
          </SelectField>
          <Submit className="px-4">Post</Submit>
        </div>
      </Form>
    </div>
  )
}

export default PostThread
