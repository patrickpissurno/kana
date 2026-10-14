// oxlint-disable no-magic-numbers

export type RedirectStatusCode = 301 | 302 | 303 | 307 | 308;
export type InfoStatusCode = 100 | 101 | 102 | 103;
export type ErrorStatusCode =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451;
export type UnexpectedErrorStatusCode =
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511;
export type SuccessStatusCode = 200 | 201 | 204 | 205 | 206 | 207 | 208 | 226;
