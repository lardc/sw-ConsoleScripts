function vp(data_v, data_c)
{
	var peak_v = [];
	var peak_c = [];
	
	for (var i = 0; i < data_v.length; ++i)
	{
		data_v[i] = parseFloat(data_v[i]);
		data_c[i] = parseFloat(data_c[i]);
	}
	
	for (var i = 0; i < data_v.length; ++i)
	{
		// find peak begin
		while (data_v[i++] < 100 && i < data_v.length);
		
		// find peak end
		var j = i;
		while (data_v[j++] >= 100 && j < data_v.length);
		
		if (i >= data_v.length || j >= data_v.length)
			break;
		
		// find voltage peak
		var amp_v = data_v[i], amp_c = data_c[i], amp_i = i;
		for (var k = i; k < j; ++k)
		{
			if (data_v[k] > amp_v)
			{
				amp_v = data_v[k];
				amp_c = data_c[k];
				amp_i = k;
			}
		}
		var amp_i_copy = amp_i;
		
		// find current peak
		for (var k = i; k < j; ++k)
		{
			if (((amp_v * 0.97) < data_v[k]) && (amp_c < data_c[k]))
			{
				amp_c = data_c[k];
				amp_i = k;
			}
		}
		amp_v = data_v[amp_i];
		
		i = j;
		
		peak_v.push(amp_v);
		peak_c.push(amp_c);
	}
	
	plotXY(peak_v, peak_c);
}