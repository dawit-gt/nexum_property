import { BadRequestException } from '@nestjs/common';
import { assertValidUpload } from './file-validation.util';

const FIVE_MB = 5 * 1024 * 1024;

describe('assertValidUpload', () => {
  it.each(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])(
    'accepts %s',
    (mimetype) => {
      expect(() => assertValidUpload({ mimetype, size: 1024 })).not.toThrow();
    },
  );

  it.each([
    'application/zip',
    'application/x-msdownload',
    'text/html',
    'image/svg+xml',
    'image/gif',
  ])('rejects %s', (mimetype) => {
    expect(() => assertValidUpload({ mimetype, size: 1024 })).toThrow(
      BadRequestException,
    );
  });

  it('accepts a file exactly at the 5MB limit', () => {
    expect(() =>
      assertValidUpload({ mimetype: 'application/pdf', size: FIVE_MB }),
    ).not.toThrow();
  });

  it('rejects a file one byte over the limit', () => {
    expect(() =>
      assertValidUpload({ mimetype: 'application/pdf', size: FIVE_MB + 1 }),
    ).toThrow(BadRequestException);
  });
});
