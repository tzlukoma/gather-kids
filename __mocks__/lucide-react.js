const React = require('react');

function makeIcon(name) {
	return (props) =>
		React.createElement('svg', { 'data-icon': name, ...props }, null);
}

module.exports = new Proxy(
	{},
	{
		get(target, prop) {
			return makeIcon(prop);
		},
	}
);
