import type { Animal } from '../engine/types'

export const ANIMALS: Animal[] = [
  { id: 'pip', name: 'Pip', species: 'Songbird', light: 'any', emoji: '🐦',
    personality: "Sings before you've had coffee.",
    hint: 'Nests high, never far from a drink.',
    needs: [
      { type: 'nest_high', within: 1, required: true },
      { type: 'water', within: 4, required: true },
      { type: 'berries', within: 4, required: false },
      { type: 'insects', within: 3, required: false },
    ] },
  { id: 'quill', name: 'Quill', species: 'Hedgehog', light: 'shade', emoji: '🦔',
    personality: 'Grumpy, fond of dusk, secretly soft.',
    hint: 'Rustles in the shadows, close to the ground.',
    needs: [
      { type: 'shelter_ground', within: 1, required: true },
      { type: 'insects', within: 3, required: true },
      { type: 'cover_low', within: 2, required: false },
    ] },
  { id: 'acorn', name: 'Acorn', species: 'Squirrel', light: 'shade', emoji: '🐿️',
    personality: 'Has buried more than it will ever find.',
    hint: 'Wants a tall tree and something to hoard.',
    needs: [
      { type: 'nest_high', within: 1, required: true },
      { type: 'nuts', within: 4, required: true },
      { type: 'seeds', within: 4, required: false },
    ] },
  { id: 'ribbit', name: 'Ribbit', species: 'Frog', light: 'any', emoji: '🐸',
    personality: 'Communicates exclusively in vibes.',
    hint: 'Heard near still water.',
    needs: [
      { type: 'water', within: 1, required: true },
      { type: 'cover_low', within: 2, required: true },
      { type: 'insects', within: 3, required: false },
    ] },
  { id: 'flit', name: 'Flit', species: 'Butterfly', light: 'open', emoji: '🦋',
    personality: 'Indecisive about flowers, committed to sunshine.',
    hint: 'Follows the sun and the flowers.',
    needs: [
      { type: 'nectar', within: 2, required: true },
      { type: 'nectar', within: 4, required: false, minSources: 2 },
      { type: 'bask', within: 4, required: false },
    ] },
  { id: 'clover', name: 'Clover', species: 'Rabbit', light: 'open', emoji: '🐰',
    personality: 'Always mid-snack. No notes.',
    hint: 'Likes low cover and an easy snack.',
    needs: [
      { type: 'cover_low', within: 2, required: true },
      { type: 'seeds', within: 4, required: true, satisfiedBy: ['berries'] },
      { type: 'berries', within: 4, required: false },
      { type: 'nectar', within: 4, required: false },
    ] },
]
