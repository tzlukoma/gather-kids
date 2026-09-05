const React = require('react');

function makeIcon(name) {
	const MockIcon = (props) =>
		React.createElement('svg', { 'data-icon': name, ...props }, null);
	MockIcon.displayName = `Mock${name}`;
	return MockIcon;
}

module.exports = new Proxy(
	{},
	{
		get(target, prop) {
			return makeIcon(prop);
		},
	}
);
