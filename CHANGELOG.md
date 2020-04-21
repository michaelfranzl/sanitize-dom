# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

WIP

## [4.0.0] - 2020-04-21

### Changed

#### Breaking changes

- Function `sanitizeHtml` now returns a HTML string instead of a DOM node snapshot.
- Arguments for filter functions changed from `node, parents, parentNodeNames` to
  `node, { parents, parentNodeNames }`.

#### Other changes

- Changed the default value of option `remove_tags_deep` from `{ '.*': ['style', 'script',
  'textarea', 'noscript'] }` to `{}`.
- Repository organization: Extraction of library functions into separate files.
- Code style improvements using `eslint`.
- Performance: Regular expressions in options are now precompiled.
- Testing: Change to ES6 module format.
- Testing: Use Node's built-in function `assert`.
- Testing: Support for browsers as well as Node.js.
- Testing: Switch from Jenkins to Github actions.

### Removed

#### Breaking

- Function `sanitizeDom` is no longer exported. It's internal use only. Use instead its wrappers
  `sanitizeNode`, `sanitizeChildNodes`, and `sanitizeHtml`.
- Removed recognition of the custom DOM Node properties `sanitize_skip_filters`, `sanitize_skip`,
  `sanitize_skip_filter_classes`, and `sanitize_skip_filter_attributes`. These are now stored in a
  `WeakMap` without their `sanitize_` prefix. See `README` for more information.
- Regular expression matching of node names removed wrapping between `^` and `$` to increase flexibility.

### Added

- Added new option `allowed_empty_tags` to provide exceptions when `options.remove_empty` is set.
- Added argument `siblingIndex` to filter functions.
- Case-insensitive matching of tag names given in options.

### Fixed

- Filtering of attributes was broken (it operated on a live node set instead of a snapshot)
