module.exports = {
  presets: [
    ['@babel/preset-env', { modules: false }],
    '@babel/preset-react'
  ],
  plugins: process.env.NODE_ENV === 'development' ? [
    [require.resolve('./hmr/babel.js'), {
      entry: [
        require.resolve('./src/index.jsx')
      ]
    }]
  ] : []
}