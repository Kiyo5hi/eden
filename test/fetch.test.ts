import { Elysia, t } from 'elysia'
import { edenFetch } from '../src'

import { describe, expect, it, beforeAll } from 'bun:test'

const json = {
    name: 'Saori',
    affiliation: 'Arius',
    type: 'Striker'
}

const app = new Elysia()
    .get('/', () => 'hi')
    .post('/', () => 'post')
    .get('/json', ({ body }) => json)
    .get(
        '/json-utf8',
        ({ set }) =>
            new Response(JSON.stringify(json), {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            })
    )
    .get('/name/:name', ({ params: { name } }) => name)
    .post(
        '/headers',
        ({ request: { headers } }) => headers.get('x-affiliation'),
        {
            schema: {
                headers: t.Object({
                    'x-affiliation': t.Literal('Arius')
                })
            }
        }
    )
    .get('/number', () => 1)
    .get('/true', () => true)
    .get('/false', () => false)
    .get('/throw-error', () => {
        throw new Error('hare')

        return 'Hi'
    })
    .get(
        '/direct-error',
        ({ set }) => {
            set.status = 500

            return 'hare'
        },
        {
            schema: {
                response: {
                    200: t.String(),
                    500: t.Literal('hare')
                }
            }
        }
    )
    .listen(8080)

const fetch = edenFetch<typeof app>('http://localhost:8080')

describe('Eden Fetch', () => {
    it('get by default', async () => {
        const data = await fetch('/', {})

        expect(data).toBe('hi')
    })

    it('post', async () => {
        const data = await fetch('/', {
            method: 'POST'
        })

        expect(data).toBe('post')
    })

    it('parse json', async () => {
        const data = await fetch('/json', {})

        expect(data).toEqual(json)
    })

    it('parse json with additional parameters', async () => {
        const data = await fetch('/json-utf8', {})

        expect(data).toEqual(json)
    })

    it('send parameters', async () => {
        const data = await fetch('/name/:name', {
            params: {
                name: 'Elysia'
            }
        })

        expect(data).toEqual('Elysia')
    })

    it('send headers', async () => {
        const data = await fetch('/headers', {
            method: 'POST',
            headers: {
                'x-affiliation': 'Arius'
            }
        })

        expect(data).toEqual('Arius')
    })

    it('parse number', async () => {
        const data = await fetch('/number', {})

        expect(data).toEqual(1)
    })

    it('parse true', async () => {
        const data = await fetch('/true', {})

        expect(data).toEqual(true)
    })

    it('parse false', async () => {
        const data = await fetch('/false', {})

        expect(data).toEqual(false)
    })

    it('handle throw error', async () => {
        const data = await fetch('/throw-error', {})

        expect(data instanceof Error).toEqual(true)

        if (data instanceof Error) expect(data.value).toEqual('hare')
    })

    it('scope down error', async () => {
        const data = await fetch('/direct-error', {})

        expect(data instanceof Error).toEqual(true)

        if (data instanceof Error)
            switch (data.status) {
                case 500:
                    expect(data.value).toEqual('hare')
            }
    })
})
