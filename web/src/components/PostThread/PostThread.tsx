import { hashThread } from '../../../../hashThread'
import { useCallback, useState } from 'react'
import {
  FieldValues,
  FileField,
  Form,
  Label,
  SelectField,
  TextAreaField,
} from '@redwoodjs/forms'
import { usePrivateKeys } from '../KeyContext/KeyContext'
import { KeyBody } from '../KeyItem/KeyItem'
import { useMutation } from '@redwoodjs/web'
import { CreateThreadInput, Thread } from 'types/graphql'
import * as openpgp from "openpgp";

const ADD_THREAD = gql`
  mutation AddThread($input: CreateThreadInput!) {
    createThread(input: $input) {
      hash
    }
  }
`

const PostThread = () => {
  const privateKeys = usePrivateKeys()
  const [addThread] = useMutation<
    { createThread: { hash: string } },
    { input: CreateThreadInput }
  >(ADD_THREAD)

  const handleSubmit = useCallback((v: FieldValues) => {
    (async () => {
      const msg = await openpgp.createCleartextMessage({
        text:`${v.replyTo ? `replyTo:${v.replyTo}`:""}\n

${v.body}
`
      })

      const pk = privateKeys.find(x => x.getKeyID().toHex() === v["sk"])
      if (!pk.isPrivate()) {
        throw "not a pk"
      }

      msg.sign([pk])

      const armoredMsg = openpgp.armor(openpgp.enums.armor.message, msg)

      const res = await addThread({
        variables: {
          input: {
            clearText: armoredMsg,
          }
        }
      })

      window.location.href = `/t/${res.data.createThread.hash}`
    })()
  }, [privateKeys, addThread])

  return (
    <div>
      <Form onSubmit={handleSubmit}>
        <Label name="body">Body: </Label>
        <TextAreaField name="body" />
        <SelectField name="sk">
          {privateKeys.map((key) => (
            <option value={key.getKeyID().toHex()}>{KeyBody(key)}</option>
          ))}
        </SelectField>
      </Form>
    </div>
  )
}

export default PostThread
