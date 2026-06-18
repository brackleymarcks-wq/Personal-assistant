async function test() {
  for(let i=0; i<3; i++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{role: 'user', content: 'say test'}]
        })
      });
      console.log(res.status, await res.text());
    } catch(e) {
      console.error(e);
    }
  }
}
test();
