import type { Meta, StoryObj } from '@storybook/react';
import DesignSyncPage from './page';

const meta: Meta<typeof DesignSyncPage> = {
  title: 'DesignSync/Page',
  component: DesignSyncPage,
  parameters: {
    layout: 'fullscreen'
  }
};
export default meta;

export const Default: StoryObj<typeof DesignSyncPage> = {
  args: {}
};
