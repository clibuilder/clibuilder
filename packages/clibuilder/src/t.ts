/**
 * Option and argument type descriptors from `args-minus`.
 *
 * Declare an option or argument `type` with `t` instead of `z` to have it converted and checked by `args-minus`.
 * Each declaration is parsed by its own type, so a command can mix `z` and `t` declarations.
 */
export {
	type AnyDescriptor,
	type CheckFn,
	type Data as DescriptorData,
	type Descriptor,
	type ElementDescriptor,
	isDescriptor,
	type Kind as DescriptorKind,
	type OutputOf,
	type StandardSchemaV1,
	t
} from 'args-minus'
