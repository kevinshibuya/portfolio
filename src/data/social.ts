export interface SocialLink {
  platform: 'github' | 'linkedin'
  url: string
  label: string
}

export const socialLinks: SocialLink[] = [
  {
    platform: 'github',
    url: 'https://github.com/kevinshibuya',
    label: 'GitHub',
  },
  {
    platform: 'linkedin',
    url: 'https://linkedin.com/in/kevinshibuya',
    label: 'LinkedIn',
  },
]

export const EMAIL = 'hello@kevinshibuya.com'
