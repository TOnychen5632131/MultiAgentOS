import { mouse, keyboard, Button, Point, straightTo } from '@nut-tree/nut-js';
import type { AgentAction } from '../renderer/lib/types';

const CLICK_MAP: Record<string, Button> = {
  left: Button.LEFT,
  right: Button.RIGHT,
  middle: Button.MIDDLE,
};

type MovePayload = { x: number; y: number };
type ClickPayload = { button?: 'left' | 'right' | 'middle'; double?: boolean };
type ScrollPayload = { amount: number };
type InputPayload = { text: string };
type WaitPayload = { ms: number };

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function doMove(payload?: MovePayload) {
  if (!payload) return;
  const { x, y } = payload;
  await mouse.move(straightTo(new Point(x, y)));
}

async function doClick(payload?: ClickPayload) {
  const button = payload?.button
    ? (CLICK_MAP[payload.button] ?? Button.LEFT)
    : Button.LEFT;
  if (payload?.double) {
    await mouse.doubleClick(button);
    return;
  }
  if (button === Button.RIGHT) {
    await mouse.rightClick();
    return;
  }
  if (button === Button.MIDDLE) {
    await mouse.click(Button.MIDDLE);
    return;
  }
  await mouse.click(Button.LEFT);
}

async function doScroll(payload?: ScrollPayload) {
  if (!payload) return;
  const amount = payload.amount ?? 0;
  if (amount === 0) return;
  if (amount > 0) {
    await mouse.scrollUp(amount);
  } else {
    await mouse.scrollDown(Math.abs(amount));
  }
}

async function doInput(payload?: InputPayload) {
  if (!payload?.text) return;
  await keyboard.type(payload.text);
}

async function doWait(payload?: WaitPayload) {
  if (!payload?.ms) return;
  await sleep(payload.ms);
}

export async function executeActions(actions: AgentAction[]) {
  for (const action of actions) {
    switch (action.type) {
      case 'move':
        await doMove(action.payload as MovePayload);
        break;
      case 'click':
        await doClick(action.payload as ClickPayload);
        break;
      case 'scroll':
        await doScroll(action.payload as ScrollPayload);
        break;
      case 'input':
        await doInput(action.payload as InputPayload);
        break;
      case 'wait':
        await doWait(action.payload as WaitPayload);
        break;
      default:
        // unsupported type; skip
        break;
    }
  }
  return { ok: true };
}
